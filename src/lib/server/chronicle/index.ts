import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { battleReport, paintingAward, reportAudit, warband, world } from '$lib/server/db/schema';
import { buildChronicle, type ChronicleEvent, type ChronicleWarband } from '$lib/domain/chronicle';
import { FOLD_ORDER } from '$lib/server/reports';
import { replay, foldCombatants, type FoldReport } from '$lib/domain/control-fold';
import { playedDateSortKey } from '$lib/domain/played-date';

/**
 * The campaign Chronicle (issue #7): the activity feed, newest first and grouped by cycle. A pure
 * read — it folds the records the campaign already keeps (reports, painting awards, warband
 * musters) through `buildChronicle`, so an arbiter report edit or a fresh muster re-derives it with
 * no stored feed. Returns the full campaign; the dataset is small at hobby scale (no pagination).
 */
export async function getChronicle(
	campaignId: string,
	currentCycle: number
): Promise<ChronicleEvent[]> {
	const [reports, awards, warbands, audits, worlds] = await Promise.all([
		db.query.battleReport.findMany({
			where: eq(battleReport.campaignId, campaignId),
			// Fold order (the one shared by control and standings) so the replay below reproduces the
			// map's per-report shares exactly — control-shift detection sits on that same replay.
			orderBy: FOLD_ORDER,
			columns: {
				id: true,
				cycle: true,
				playedOn: true,
				createdAt: true,
				worldId: true,
				outcome: true
			},
			with: {
				world: { columns: { name: true } },
				combatants: {
					columns: { side: true, guestName: true },
					with: {
						warband: { columns: { id: true, name: true, short: true, color: true } }
					}
				}
			}
		}),
		db.query.paintingAward.findMany({
			where: eq(paintingAward.campaignId, campaignId),
			columns: { id: true, cycle: true, createdAt: true, kind: true, note: true, imagePath: true },
			with: { warband: { columns: { id: true, name: true, short: true, color: true } } }
		}),
		db.query.warband.findMany({
			where: eq(warband.campaignId, campaignId),
			columns: { id: true, name: true, short: true, color: true, createdAt: true }
		}),
		db.query.reportAudit.findMany({
			where: eq(reportAudit.campaignId, campaignId),
			columns: { id: true, action: true, reason: true, snapshot: true, createdAt: true }
		}),
		// World names for audit rows: the affected world lives on the report's frozen snapshot (a
		// withdrawn report may be gone, but its world endures), so resolve names by id from the map.
		db.query.world.findMany({
			where: eq(world.campaignId, campaignId),
			columns: { id: true, name: true }
		})
	]);

	const worldName = new Map(worlds.map((w) => [w.id, w.name]));

	const tag = (w: ChronicleWarband): ChronicleWarband => ({
		id: w.id,
		name: w.name,
		short: w.short,
		color: w.color
	});

	/**
	 * One side's chips. An outside opponent has no warband row, so it gets a neutral chip carrying
	 * its recorded name and a synthetic id — unique within the report, purely so the keyed `{#each}`
	 * stays stable when a side fields two of them.
	 */
	const side = (
		r: {
			id: string;
			combatants: { side: string; guestName: string | null; warband: ChronicleWarband | null }[];
		},
		which: 'attacker' | 'defender'
	): ChronicleWarband[] =>
		r.combatants
			.filter((c) => c.side === which)
			.map((c, i) =>
				c.warband
					? tag(c.warband)
					: {
							id: `${r.id}:guest:${which}:${i}`,
							name: c.guestName ?? 'Outside opponent',
							short: c.guestName ?? 'Guest',
							color: 'var(--color-ink-faint)',
							guest: true
						}
			);

	// Replay the whole campaign's reports (in fold order) once; `steps[i]` carries report `reports[i]`'s
	// world shares before and after it applied. The chronicle reads owner off these — it never recomputes
	// shares — so control-shift events stay in lockstep with the map.
	const { steps } = replay(
		reports.map<FoldReport>((r) => ({
			worldId: r.worldId,
			outcome: r.outcome,
			// Guests hold no ground, so they're absent from the replay exactly as they are in
			// control and standings — a guest can never move a world's owner.
			combatants: foldCombatants(
				r.combatants.map((c) => ({ warbandId: c.warband?.id ?? null, side: c.side }))
			)
		}))
	);
	const toShares = (m: Map<string, number>) =>
		[...m.entries()].map(([warbandId, share]) => ({ warbandId, share }));

	return buildChronicle({
		currentCycle,
		reports: reports.map((r, i) => ({
			id: r.id,
			cycle: r.cycle,
			// The day the battle was fought, not the day it was filed — the feed is a chronicle of the
			// war, and it has to run in the same order the fold does or a report's control shift would
			// appear detached from the shares that produced it. Submit time still separates two battles
			// on the same day, exactly as it does in the fold.
			at: playedDateSortKey(r.playedOn),
			filedAt: r.createdAt.getTime(),
			worldId: r.worldId,
			worldName: r.world.name,
			outcome: r.outcome,
			attackers: side(r, 'attacker'),
			defenders: side(r, 'defender'),
			control: { pre: toShares(steps[i].pre), post: toShares(steps[i].post) }
		})),
		awards: awards.map((a) => ({
			id: a.id,
			cycle: a.cycle,
			at: a.createdAt.getTime(),
			warband: tag(a.warband),
			kind: a.kind,
			note: a.note,
			imagePath: a.imagePath
		})),
		musters: warbands.map((w) => ({
			id: w.id,
			at: w.createdAt.getTime(),
			warband: tag(w)
		})),
		audits: audits.map((au) => ({
			id: au.id,
			at: au.createdAt.getTime(),
			action: au.action,
			worldId: au.snapshot.report.worldId,
			worldName: worldName.get(au.snapshot.report.worldId) ?? 'an unknown world',
			reason: au.reason
		}))
	});
}
