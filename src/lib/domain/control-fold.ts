/**
 * Control movement and the ordered Replay (ADR 0002, CONTEXT.md). Where `control.ts` *reads*
 * shares (owner / contested / unclaimed), this is how shares *move*: a chronological fold over
 * the approved battle reports.
 *
 * Each world is a fixed 100% pool. Every warband holds an integer percentage (in steps of
 * 10), clamped to 0–100; the leftover — `100 − Σ(shares)` — is the world's uncontested
 * remainder. Worlds start fully uncontested (the empty map). A decisive report moves 10
 * points per combatant from the losing side to the winning side, drawing from the loser
 * first and then from the uncontested pool, never letting the world exceed 100%.
 *
 * The result is a pure function of the ordered reports, so the stored snapshot is always
 * reproducible by replay — an arbiter edit or deletion just re-folds. Order matters once a
 * warband hits 0% or the pool empties, which is why this takes the reports in sequence.
 *
 * `replay` is the one home for that fold: world Control reads its final per-world shares, and
 * the points Standings read each report's shares *before* and *after* it applies. Both sit on
 * the same replay, so they can never disagree about what happened or in what order.
 */

export type FoldSide = 'attacker' | 'defender';

/** What one report does to a single world — the per-step primitive, no world identity needed. */
export interface FoldStep {
	/** The winning side, or 'stalemate' for a draw (which moves no control). */
	outcome: FoldSide | 'stalemate';
	combatants: { warbandId: string; side: FoldSide }[];
}

/** A report positioned in the multi-world Replay: a fold step tagged with the world it was fought over. */
export interface FoldReport extends FoldStep {
	worldId: string;
}

/** One report applied, with its world's shares immediately before and after. */
export interface ReplayStep {
	/** Shares on the report's world BEFORE it applied — what underdog reads. */
	pre: Map<string, number>;
	/** Shares AFTER — what milestone banking tracks the max of. */
	post: Map<string, number>;
}

/** The result of replaying an ordered report log. */
export interface Replay {
	/** One step per input report, in input order: `steps[i]` is `reports[i]` applied. */
	steps: ReplayStep[];
	/** The final shares per world, `worldId → (warbandId → share)`. */
	final: Map<string, Map<string, number>>;
}

const STEP = 10;
const POOL = 100;

function total(control: Map<string, number>): number {
	let sum = 0;
	for (const v of control.values()) sum += v;
	return sum;
}

/**
 * Apply a single report to a control snapshot, returning a NEW map (the input is never
 * mutated, so the client can preview a prospective report against live shares safely).
 * This is the one fold step; `replay` threads it across a world's reports in order.
 */
export function applyReport(
	control: Map<string, number>,
	report: FoldStep
): Map<string, number> {
	const next = new Map(control);
	if (report.outcome === 'stalemate') return next;

	const winners = report.combatants.filter((c) => c.side === report.outcome);
	const losers = report.combatants.filter((c) => c.side !== report.outcome);

	// 1. Losers drop 10 each, floored at 0 (a warband never goes negative).
	for (const { warbandId } of losers) {
		const dropped = Math.max(0, (next.get(warbandId) ?? 0) - STEP);
		if (dropped === 0) next.delete(warbandId);
		else next.set(warbandId, dropped);
	}

	// 2. What's now free to claim: the loser's loss plus the standing uncontested pool.
	let pool = POOL - total(next);

	// 3. Winners gain 10 each, capped so neither the winner nor the world exceeds 100%.
	for (const { warbandId } of winners) {
		const current = next.get(warbandId) ?? 0;
		const gain = Math.min(STEP, POOL - current, pool);
		if (gain > 0) {
			next.set(warbandId, current + gain);
			pool -= gain;
		}
	}

	return next;
}

/**
 * Replay an ordered report log into per-world control, surfacing each report's before/after
 * shares as it goes. The single home for the fold both Control and Standings read.
 *
 * Scope-agnostic: pass one world's reports (Control's per-world recompute) or a whole campaign's
 * (the Standings fold) — reports are bucketed by `worldId`. Warbands at 0% are omitted from each
 * snapshot, so `final` only ever carries live holders, which `deriveControl` reads directly.
 *
 * PRECONDITION: `reports` are already in fold order (submit order — `createdAt`, then `id`). This
 * is a pure function over that ordered list; it does no I/O and never mutates a snapshot it emits.
 */
export function replay(reports: FoldReport[]): Replay {
	const final = new Map<string, Map<string, number>>();
	const steps = reports.map<ReplayStep>((report) => {
		// `pre` is the previous post for this world (an empty map for its first report). applyReport
		// returns a fresh map, so `pre` is never mutated by later steps — safe for the consumer to read.
		const pre = final.get(report.worldId) ?? new Map<string, number>();
		const post = applyReport(pre, report);
		final.set(report.worldId, post);
		return { pre, post };
	});
	return { steps, final };
}
