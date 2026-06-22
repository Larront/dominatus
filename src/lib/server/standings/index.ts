import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { battleReport, paintingAward, warband } from '$lib/server/db/schema';
import { FOLD_ORDER } from '$lib/server/reports';
import {
	computeStandings,
	type StandingsReport,
	type StandingsAward,
	type StandingBreakdown,
	type PaintingKind
} from '$lib/domain/standings';
import type { StatReport } from '$lib/domain/stat-block';
import { DEFAULT_PROFILE, type ScoringProfile } from '$lib/domain/scoring-profile';

/** A standings table row: a warband's display info plus its point breakdown. */
export interface StandingRow extends StandingBreakdown {
	id: string;
	name: string;
	short: string;
	color: string;
	/** True when the viewing user commands this warband. */
	you: boolean;
}

const ZERO: StandingBreakdown = {
	win: 0,
	draw: 0,
	underdog: 0,
	narrative: 0,
	loss: 0,
	milestone: 0,
	streak: 0,
	kingkiller: 0,
	painting: 0,
	total: 0
};

const paintingValue = (profile: ScoringProfile, kind: PaintingKind): number =>
	kind === 'unit'
		? profile.paintUnit
		: kind === 'character'
			? profile.paintCharacter
			: profile.paintTerrain;

/**
 * The campaign leaderboard (ADR 0003/0004): every warband with its point breakdown, strongest
 * first, scored by the campaign's profile. Points are derived by folding the report log (the same
 * order control uses) plus painting awards, recomputed on read — no stored standings, so an arbiter
 * report edit or a profile change re-derives it.
 */
export async function getStandings(
	campaignId: string,
	profile: ScoringProfile,
	viewerUserId?: string | null
): Promise<StandingRow[]> {
	const [warbands, reports, awards] = await Promise.all([
		db.query.warband.findMany({
			where: eq(warband.campaignId, campaignId),
			columns: { id: true, name: true, short: true, color: true, commanderUserId: true }
		}),
		db.query.battleReport.findMany({
			where: eq(battleReport.campaignId, campaignId),
			// The one shared fold order, so standings replay the log exactly as control does.
			orderBy: FOLD_ORDER,
			columns: { worldId: true, outcome: true, narrative: true },
			with: { combatants: { columns: { warbandId: true, side: true } } }
		}),
		db.query.paintingAward.findMany({
			where: eq(paintingAward.campaignId, campaignId),
			columns: { warbandId: true, kind: true }
		})
	]);

	const foldReports = reports.map<StandingsReport>((r) => ({
		worldId: r.worldId,
		outcome: r.outcome,
		hasNarrative: !!r.narrative?.trim(),
		combatants: r.combatants
	}));

	const points = computeStandings(foldReports, awards as StandingsAward[], profile);

	return warbands
		.map((wb) => ({
			id: wb.id,
			name: wb.name,
			short: wb.short,
			color: wb.color,
			you: viewerUserId ? wb.commanderUserId === viewerUserId : false,
			...(points.get(wb.id) ?? ZERO)
		}))
		.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

/**
 * The battle-report log shaped for the warband stat block (issue #8), in fold order (oldest first,
 * so streaks read chronologically), narrowed to the games the viewer's warbands fought in. Carries
 * every combatant of those reports — both sides — since the block reads the opposing side's VP line
 * too. Returns the whole side's score components; the pure `computeStatBlock` does the rest under a
 * self filter. Empty when the viewer commands no warbands here.
 *
 * Deliberately a separate read from `getStandings`' fold: the stat block is a personal, self-filtered
 * derivation, not part of the control/standings replay, and it needs columns that fold doesn't (VP
 * and the first-turn side). It can't disagree with the replay because it scores nothing control does.
 */
export async function getStatReports(
	campaignId: string,
	myWarbandIds: string[]
): Promise<StatReport[]> {
	if (myWarbandIds.length === 0) return [];
	const mine = new Set(myWarbandIds);

	const reports = await db.query.battleReport.findMany({
		where: eq(battleReport.campaignId, campaignId),
		orderBy: FOLD_ORDER,
		columns: { outcome: true, wentFirst: true },
		with: {
			combatants: {
				columns: {
					warbandId: true,
					side: true,
					primaryVp: true,
					battleReadyVp: true,
					secondaries: true
				}
			}
		}
	});

	return reports
		.filter((r) => r.combatants.some((c) => mine.has(c.warbandId)))
		.map<StatReport>((r) => ({
			outcome: r.outcome,
			wentFirst: r.wentFirst,
			combatants: r.combatants.map((c) => ({
				warbandId: c.warbandId,
				side: c.side,
				primaryVp: c.primaryVp,
				battleReadyVp: c.battleReadyVp,
				secondaries: c.secondaries
			}))
		}));
}

/**
 * Painting awards for a campaign, newest first — for the arbiter's grant/revoke panel. Each award's
 * points are read live from the profile by kind (ADR 0004), so the panel reflects the live rules.
 */
export async function getPaintingAwards(
	campaignId: string,
	profile: ScoringProfile = DEFAULT_PROFILE
) {
	const rows = await db.query.paintingAward.findMany({
		where: eq(paintingAward.campaignId, campaignId),
		orderBy: (a, { desc }) => [desc(a.createdAt)],
		with: { warband: { columns: { name: true, short: true, color: true } } }
	});
	return rows.map((a) => ({
		id: a.id,
		warbandId: a.warbandId,
		warbandName: a.warband.name,
		warbandShort: a.warband.short,
		warbandColor: a.warband.color,
		cycle: a.cycle,
		kind: a.kind,
		points: paintingValue(profile, a.kind),
		note: a.note
	}));
}

/**
 * Grant a painting award. Only the kind is recorded — its point value is read from the campaign's
 * scoring profile at compute time (ADR 0004). Caller has already checked the arbiter role.
 */
export async function grantPaintingAward(input: {
	campaignId: string;
	warbandId: string;
	cycle: number;
	kind: PaintingKind;
	note?: string | null;
	grantedByUserId: string;
}): Promise<void> {
	await db.insert(paintingAward).values({
		campaignId: input.campaignId,
		warbandId: input.warbandId,
		cycle: input.cycle,
		kind: input.kind,
		note: input.note?.trim() || null,
		grantedByUserId: input.grantedByUserId
	});
}

/** Revoke a painting award, scoped to its campaign so a stray id can't reach across campaigns. */
export async function revokePaintingAward(id: string, campaignId: string): Promise<void> {
	await db
		.delete(paintingAward)
		.where(and(eq(paintingAward.id, id), eq(paintingAward.campaignId, campaignId)));
}
