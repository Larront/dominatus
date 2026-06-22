import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { battleReport, paintingAward, reportAudit, warband, world } from '$lib/server/db/schema';
import { buildChronicle, type ChronicleEvent, type ChronicleWarband } from '$lib/domain/chronicle';
import { FOLD_ORDER } from '$lib/server/reports';
import { replay, type FoldReport } from '$lib/domain/control-fold';

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
			columns: { id: true, cycle: true, createdAt: true, worldId: true, outcome: true },
			with: {
				world: { columns: { name: true } },
				combatants: {
					columns: { side: true },
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

	// Replay the whole campaign's reports (in fold order) once; `steps[i]` carries report `reports[i]`'s
	// world shares before and after it applied. The chronicle reads owner off these — it never recomputes
	// shares — so control-shift events stay in lockstep with the map.
	const { steps } = replay(
		reports.map<FoldReport>((r) => ({
			worldId: r.worldId,
			outcome: r.outcome,
			combatants: r.combatants.map((c) => ({ warbandId: c.warband.id, side: c.side }))
		}))
	);
	const toShares = (m: Map<string, number>) =>
		[...m.entries()].map(([warbandId, share]) => ({ warbandId, share }));

	return buildChronicle({
		currentCycle,
		reports: reports.map((r, i) => ({
			id: r.id,
			cycle: r.cycle,
			at: r.createdAt.getTime(),
			worldId: r.worldId,
			worldName: r.world.name,
			outcome: r.outcome,
			attackers: r.combatants.filter((c) => c.side === 'attacker').map((c) => tag(c.warband)),
			defenders: r.combatants.filter((c) => c.side === 'defender').map((c) => tag(c.warband)),
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
