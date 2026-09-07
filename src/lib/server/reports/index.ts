import { and, eq, asc, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	battleReport,
	battleReportCombatant,
	reportAudit,
	worldControl
} from '$lib/server/db/schema';
import { replay, foldCombatants, type FoldReport } from '$lib/domain/control-fold';
import { buildReportSnapshot } from './snapshot';
import type { BattleReportInput } from '$lib/schemas/battle-report';

/** The exact transaction-client type drizzle hands the `db.transaction` callback. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The fold order over the battle-report log: submit order (`createdAt`), with `id` breaking any
 * same-millisecond tie. This is the precondition `replay()` requires (CONTEXT: Replay) — declared
 * once and shared by every fold reader (here and in standings) so world control and the points
 * standings can never order the log differently. Display orderings (e.g. the battle log, newest
 * first) are deliberately *not* the fold order and don't use this.
 */
export const FOLD_ORDER = [asc(battleReport.createdAt), asc(battleReport.id)];

/** One combatant in the log, with its score breakdown and a derived total. */
export interface BattleLogCombatant {
	/** The campaign warband, or null when this was an outside opponent — then `guestName` is set. */
	warbandId: string | null;
	/** An outside opponent's name; null for a campaign warband. */
	guestName: string | null;
	primaryVp: number | null;
	battleReadyVp: number | null;
	secondaries: { name: string; victoryPoints: number }[];
	/** primary + Σ secondaries + battle-ready, when any component is recorded. */
	totalVp: number | null;
}

/** A battle report shaped for the world intel drawer's battle log. */
export interface BattleLogEntry {
	id: string;
	worldId: string;
	cycle: number;
	outcome: 'attacker' | 'defender' | 'stalemate';
	wentFirst: 'attacker' | 'defender' | null;
	/** The battle size fought at — `combat-patrol` or a points size; null if not recorded. */
	battleSize: string | null;
	planetaryEffect: string | null;
	narrative: string | null;
	/** Stored scoresheet filename, served via /report/image/[file]; null if none was uploaded. */
	imagePath: string | null;
	attackers: BattleLogCombatant[];
	defenders: BattleLogCombatant[];
}

/** Sum the recorded score components; null when nothing was recorded. */
function totalVp(c: {
	primaryVp: number | null;
	battleReadyVp: number | null;
	secondaries: { victoryPoints: number }[] | null;
}): number | null {
	const parts = [
		c.primaryVp,
		c.battleReadyVp,
		...(c.secondaries ?? []).map((s) => s.victoryPoints)
	];
	const recorded = parts.filter((p): p is number => p != null);
	return recorded.length ? recorded.reduce((a, b) => a + b, 0) : null;
}

/**
 * Every battle report in a campaign, newest cycle first, with combatants split
 * by side. Returned for the whole campaign and grouped by world on the client —
 * the dataset is small at hobby scale and the map shows one world at a time.
 */
export async function getBattleLog(campaignId: string): Promise<BattleLogEntry[]> {
	const rows = await db.query.battleReport.findMany({
		where: eq(battleReport.campaignId, campaignId),
		orderBy: (r, { desc }) => [desc(r.cycle), desc(r.createdAt)],
		with: { combatants: true }
	});

	const toCombatant = (c: (typeof rows)[number]['combatants'][number]): BattleLogCombatant => ({
		warbandId: c.warbandId,
		guestName: c.guestName,
		primaryVp: c.primaryVp,
		battleReadyVp: c.battleReadyVp,
		secondaries: c.secondaries ?? [],
		totalVp: totalVp(c)
	});

	return rows.map((r) => ({
		id: r.id,
		worldId: r.worldId,
		cycle: r.cycle,
		outcome: r.outcome,
		wentFirst: r.wentFirst,
		battleSize: r.battleSize,
		planetaryEffect: r.planetaryEffect,
		narrative: r.narrative,
		imagePath: r.imagePath,
		attackers: r.combatants.filter((c) => c.side === 'attacker').map(toCombatant),
		defenders: r.combatants.filter((c) => c.side === 'defender').map(toCombatant)
	}));
}

/**
 * Re-derive a world's control snapshot from scratch by folding all its reports in
 * chronological order (ADR 0002). Run inside a transaction after any report write —
 * submit, edit, or delete — so the stored shares are always exactly the fold of the log.
 * Synchronous: better-sqlite3 transactions don't allow awaits in the callback.
 */
export function recomputeWorldControl(tx: Tx, worldId: string): void {
	const reports = tx
		.select({ id: battleReport.id, outcome: battleReport.outcome })
		.from(battleReport)
		.where(eq(battleReport.worldId, worldId))
		.orderBy(...FOLD_ORDER)
		.all();

	const combatants = reports.length
		? tx
				.select({
					reportId: battleReportCombatant.reportId,
					warbandId: battleReportCombatant.warbandId,
					side: battleReportCombatant.side
				})
				.from(battleReportCombatant)
				.where(
					inArray(
						battleReportCombatant.reportId,
						reports.map((r) => r.id)
					)
				)
				.all()
		: [];

	// Guests hold no ground, so they never reach the fold — `foldCombatants` is the one place
	// that rule lives, shared with the standings fold.
	const byReport = new Map<string, { warbandId: string; side: 'attacker' | 'defender' }[]>();
	for (const c of combatants) {
		const list = byReport.get(c.reportId) ?? [];
		list.push(...foldCombatants([c]));
		byReport.set(c.reportId, list);
	}

	// Per-world recompute: replay just this world's reports and read its final shares.
	const folded =
		replay(
			reports.map<FoldReport>((r) => ({
				worldId,
				outcome: r.outcome,
				combatants: byReport.get(r.id) ?? []
			}))
		).final.get(worldId) ?? new Map<string, number>();

	// The snapshot is a pure cache of the fold: clear and rewrite the live holders.
	tx.delete(worldControl).where(eq(worldControl.worldId, worldId)).run();
	const rows = [...folded.entries()].map(([warbandId, share]) => ({ worldId, warbandId, share }));
	if (rows.length) tx.insert(worldControl).values(rows).run();
}

/** What the arbiter is doing to a report, for the audit trail and (optional) reason. */
type AuditContext = { actorUserId: string; reason?: string | null };

/**
 * Within an open transaction, freeze a report's current state to the append-only audit trail
 * (issue #6) and return the report row so the caller can reuse it (e.g. for its world/image). Reads
 * the full report and its combatants *before* the caller mutates them, so the snapshot is the prior
 * state. Throws if the report isn't in this campaign — the caller's check, run before any write.
 */
function auditReport(
	tx: Tx,
	action: 'edit' | 'delete',
	reportId: string,
	campaignId: string,
	ctx: AuditContext
): typeof battleReport.$inferSelect {
	const [report] = tx
		.select()
		.from(battleReport)
		.where(and(eq(battleReport.id, reportId), eq(battleReport.campaignId, campaignId)))
		.all();
	if (!report) throw new Error('Report not found in this campaign');

	const combatants = tx
		.select()
		.from(battleReportCombatant)
		.where(eq(battleReportCombatant.reportId, reportId))
		.all();

	tx.insert(reportAudit)
		.values({
			campaignId,
			reportId,
			action,
			actorUserId: ctx.actorUserId,
			reason: ctx.reason?.trim() || null,
			snapshot: buildReportSnapshot(report, combatants)
		})
		.run();

	return report;
}

/**
 * Does this stored scoresheet belong to a report in this campaign? Gates the image-serving
 * route so a member of one campaign can't read another's scoresheet by filename.
 */
export async function imageInCampaign(campaignId: string, name: string): Promise<boolean> {
	const row = await db.query.battleReport.findFirst({
		where: and(eq(battleReport.campaignId, campaignId), eq(battleReport.imagePath, name)),
		columns: { id: true }
	});
	return !!row;
}

/** A report row shaped for the arbiter's admin list — enough to identify and act on it. */
export interface AdminReportEntry {
	id: string;
	cycle: number;
	worldId: string;
	worldName: string;
	outcome: 'attacker' | 'defender' | 'stalemate';
	attackers: AdminReportTag[];
	defenders: AdminReportTag[];
}

/** A combatant reduced to the chip the admin table draws: a warband's tag, or a guest's name. */
export interface AdminReportTag {
	short: string;
	color: string;
	/** True when this chip is an outside opponent rather than a campaign warband. */
	guest: boolean;
}

/**
 * Every report in a campaign, in fold order (oldest first — the order control replays), for the
 * arbiter's report-management table. Carries the world name and combatant tags to identify each.
 */
export async function getCampaignReportsAdmin(campaignId: string): Promise<AdminReportEntry[]> {
	const rows = await db.query.battleReport.findMany({
		where: eq(battleReport.campaignId, campaignId),
		orderBy: FOLD_ORDER,
		columns: { id: true, cycle: true, worldId: true, outcome: true },
		with: {
			world: { columns: { name: true } },
			combatants: {
				columns: { side: true, guestName: true },
				with: { warband: { columns: { short: true, color: true } } }
			}
		}
	});

	return rows.map((r) => {
		const tag = (side: 'attacker' | 'defender'): AdminReportTag[] =>
			r.combatants
				.filter((c) => c.side === side)
				// A guest has no warband row, so it shows its own name in a neutral colour.
				.map((c) =>
					c.warband
						? { short: c.warband.short, color: c.warband.color, guest: false }
						: { short: c.guestName ?? 'Guest', color: 'var(--color-ink-faint)', guest: true }
				);
		return {
			id: r.id,
			cycle: r.cycle,
			worldId: r.worldId,
			worldName: r.world.name,
			outcome: r.outcome,
			attackers: tag('attacker'),
			defenders: tag('defender')
		};
	});
}

/**
 * One report shaped as the battle-report form's input, for the arbiter to amend, plus the stored
 * scoresheet filename so the edit form can show what's already attached (the image isn't part of
 * the form schema). Scoped to the campaign so a stray id can't reach across campaigns. Returns
 * null if it isn't found here.
 */
export async function getReportForEdit(
	reportId: string,
	campaignId: string
): Promise<{ data: BattleReportInput; imagePath: string | null } | null> {
	const r = await db.query.battleReport.findFirst({
		where: and(eq(battleReport.id, reportId), eq(battleReport.campaignId, campaignId)),
		with: { combatants: true }
	});
	if (!r) return null;
	return {
		imagePath: r.imagePath,
		data: {
			worldId: r.worldId,
			cycle: r.cycle,
			outcome: r.outcome,
			wentFirst: r.wentFirst,
			// '' rather than null so the picker binds to its "not recorded" entry on an amend.
			battleSize: r.battleSize ?? '',
			planetaryEffect: r.planetaryEffect ?? undefined,
			narrative: r.narrative ?? undefined,
			combatants: r.combatants.map((c) => ({
				warbandId: c.warbandId ?? '',
				guestName: c.guestName,
				side: c.side,
				primaryMission: c.primaryMission ?? '',
				forceDisposition: c.forceDisposition ?? '',
				primaryVp: c.primaryVp,
				battleReadyVp: c.battleReadyVp,
				secondaries: c.secondaries ?? []
			}))
		}
	};
}

/**
 * Amend an existing report and re-fold control. The report's world may change, so both the old
 * and new world are re-folded. Replaces combatants wholesale (simpler and correct vs diffing).
 * Returns the affected world ids. Caller has validated the form and the arbiter role.
 */
export function updateBattleReport(
	reportId: string,
	input: BattleReportInput & { campaignId: string; imagePath?: string } & AuditContext
): { worldIds: string[]; previousImagePath: string | null } {
	return db.transaction((tx) => {
		// Freeze the pre-edit state to the audit trail first, in this same transaction, so the log and
		// its audit can never diverge. Returns the existing row so we can re-fold the old world too.
		const existing = auditReport(tx, 'edit', reportId, input.campaignId, input);
		const oldWorldId = existing.worldId;

		tx.update(battleReport)
			.set({
				worldId: input.worldId,
				cycle: input.cycle,
				outcome: input.outcome,
				wentFirst: input.wentFirst ?? null,
				battleSize: input.battleSize?.trim() || null,
				planetaryEffect: input.planetaryEffect?.trim() || null,
				narrative: input.narrative?.trim() || null,
				// Only touch the scoresheet when the arbiter uploaded a replacement; an edit
				// without a new image keeps the existing one.
				...(input.imagePath !== undefined ? { imagePath: input.imagePath } : {})
			})
			.where(eq(battleReport.id, reportId))
			.run();

		tx.delete(battleReportCombatant).where(eq(battleReportCombatant.reportId, reportId)).run();
		tx.insert(battleReportCombatant)
			.values(
				input.combatants.map((c) => ({
					reportId,
					// Exactly one identity per row (the table's check constraint): a warband, or a
					// guest's name for an opponent outside the league.
					warbandId: c.warbandId || null,
					guestName: c.warbandId ? null : (c.guestName?.trim() ?? null),
					side: c.side,
					primaryMission: c.primaryMission?.trim() || null,
					forceDisposition: c.forceDisposition?.trim() || null,
					primaryVp: c.primaryVp ?? null,
					battleReadyVp: c.battleReadyVp ?? null,
					secondaries: c.secondaries.length ? c.secondaries : null
				}))
			)
			.run();

		// Re-fold the new world, and the old one too if the report moved between worlds.
		const worldIds = oldWorldId === input.worldId ? [input.worldId] : [oldWorldId, input.worldId];
		for (const worldId of worldIds) recomputeWorldControl(tx, worldId);
		return { worldIds, previousImagePath: existing.imagePath };
	});
}

/**
 * Reverse (delete) a report and re-fold its world's control. Scoped to the campaign. Returns the
 * affected world id (null if the report wasn't found here). Caller has asserted the arbiter role.
 */
export function deleteBattleReport(
	reportId: string,
	campaignId: string,
	ctx: AuditContext
): { worldId: string | null; imagePath: string | null } {
	return db.transaction((tx) => {
		const found = tx
			.select({ id: battleReport.id })
			.from(battleReport)
			.where(and(eq(battleReport.id, reportId), eq(battleReport.campaignId, campaignId)))
			.all();
		if (!found.length) return { worldId: null, imagePath: null };

		// Freeze the pre-delete state to the audit trail first, in this same transaction; the returned
		// row gives us the world to re-fold and the scoresheet to unlink afterwards.
		const { worldId, imagePath } = auditReport(tx, 'delete', reportId, campaignId, ctx);

		// Combatants cascade on the FK; recompute the world from the now-shorter log.
		tx.delete(battleReport).where(eq(battleReport.id, reportId)).run();
		recomputeWorldControl(tx, worldId);
		// The caller unlinks the scoresheet file after the row is gone.
		return { worldId, imagePath };
	});
}

/**
 * Persist a confirmed battle report and immediately re-fold the world's control, atomically.
 * The caller has already validated the form and the submitter's campaign membership.
 */
export function submitBattleReport(
	input: BattleReportInput & {
		campaignId: string;
		submittedByUserId: string;
		imagePath?: string | null;
	}
): void {
	db.transaction((tx) => {
		const [report] = tx
			.insert(battleReport)
			.values({
				campaignId: input.campaignId,
				worldId: input.worldId,
				cycle: input.cycle,
				outcome: input.outcome,
				wentFirst: input.wentFirst ?? null,
				battleSize: input.battleSize?.trim() || null,
				planetaryEffect: input.planetaryEffect?.trim() || null,
				narrative: input.narrative?.trim() || null,
				imagePath: input.imagePath ?? null,
				submittedByUserId: input.submittedByUserId
			})
			.returning({ id: battleReport.id })
			.all();

		tx.insert(battleReportCombatant)
			.values(
				input.combatants.map((c) => ({
					reportId: report.id,
					// Exactly one identity per row (the table's check constraint): a warband, or a
					// guest's name for an opponent outside the league.
					warbandId: c.warbandId || null,
					guestName: c.warbandId ? null : (c.guestName?.trim() ?? null),
					side: c.side,
					primaryMission: c.primaryMission?.trim() || null,
					forceDisposition: c.forceDisposition?.trim() || null,
					primaryVp: c.primaryVp ?? null,
					battleReadyVp: c.battleReadyVp ?? null,
					secondaries: c.secondaries.length ? c.secondaries : null
				}))
			)
			.run();

		recomputeWorldControl(tx, input.worldId);
	});
}
