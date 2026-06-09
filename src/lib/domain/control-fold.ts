/**
 * Control movement (ADR 0002). Where `control.ts` *reads* shares (owner / contested /
 * unclaimed), this is how shares *move*: a chronological fold over a world's battle reports.
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
 */

export type FoldSide = 'attacker' | 'defender';

export interface FoldReport {
	/** The winning side, or 'stalemate' for a draw (which moves no control). */
	outcome: FoldSide | 'stalemate';
	combatants: { warbandId: string; side: FoldSide }[];
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
 * This is the one fold step; `foldControl` is just this reduced over a report log.
 */
export function applyReport(
	control: Map<string, number>,
	report: FoldReport
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
 * Fold a world's reports (oldest first) into the control % each warband holds. Warbands at
 * 0% are omitted, so the map only ever carries live holders — `deriveControl` reads it directly.
 */
export function foldControl(reports: FoldReport[]): Map<string, number> {
	let control = new Map<string, number>();
	for (const report of reports) control = applyReport(control, report);
	return control;
}
