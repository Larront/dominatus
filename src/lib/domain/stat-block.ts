/**
 * The warband stat block (issue #8) — a commander's performance, derived from the battle-report
 * log under a *self filter*. Like standings and control, it is a pure derivation: nothing is
 * stored, the block is rebuilt on read, so an arbiter report edit simply re-derives it.
 *
 * The self filter is the set of warbands the view is "for" — every warband the viewing commander
 * owns (the default) or a single one of them. A commander never fights themselves, so all the
 * self warbands in any one report sit on the *same* side; aggregating across them is clean, and
 * under the all-my-warbands filter their games interleave chronologically into one personal record.
 *
 * VP is read per side as one **line total** — primary + Σ secondaries + battle-ready, summed over
 * the side's combatants. In 2v2 a side shares one team score carried by its lead (CONTEXT: Mission;
 * the report form), so the side line is that single shared score, which is also the side's average.
 * That is why the loss differential's "opposing side's average" is just the opposing side line here.
 *
 * **Head-to-head** (issue #12) is the same block under an *opponent filter*: pass the warband ids of
 * the foe(s) and a game counts only when one of them fought on the *opposing* side. It is not a
 * separate computation — every stat (record, streaks, VP, differential) re-derives over the narrower
 * slice, so a rivalry reads in exactly the units the overall block does.
 */

import type { FoldSide } from './control-fold';

/** A combatant reduced to side identity and recorded score components. */
export interface StatCombatant {
	warbandId: string;
	side: FoldSide;
	primaryVp: number | null;
	battleReadyVp: number | null;
	secondaries: { victoryPoints: number }[] | null;
}

/**
 * A battle report reduced to what the block reads. PRECONDITION: reports are in fold order
 * (oldest first — the same order control and standings replay), so streaks read chronologically.
 */
export interface StatReport {
	outcome: FoldSide | 'stalemate';
	/** Which side took the first turn, or null when not recorded. */
	wentFirst: FoldSide | null;
	combatants: StatCombatant[];
}

/** A warband's (or commander's) performance over the filtered log. Rates/averages are null when empty. */
export interface StatBlock {
	played: number;
	wins: number;
	draws: number;
	losses: number;
	/** wins / played; null when no games played. */
	winRate: number | null;
	/** Win rate over games where the viewer's side took the first turn; null when none recorded. */
	firstWinRate: number | null;
	/** Win rate over games where the viewer's side took the second turn; null when none recorded. */
	secondWinRate: number | null;
	/** Consecutive decisive wins ending at the most recent game (0 when the latest wasn't a win). */
	currentStreak: number;
	/** The longest run of consecutive decisive wins over the whole history. */
	longestStreak: number;
	/** Mean own-line total VP across wins that recorded VP; null when none did. */
	avgVpInWins: number | null;
	/** Mean own-line total VP across losses that recorded VP; null when none did. */
	avgVpInLosses: number | null;
	/** Mean (opponent line VP − own line VP) across losses that recorded both; null when none did. */
	lossDifferential: number | null;
}

/** A side's line total: primary + Σ secondaries + battle-ready, summed over the side; null if nothing recorded. */
function sideLineVp(combatants: StatCombatant[], side: FoldSide): number | null {
	const parts: number[] = [];
	for (const c of combatants) {
		if (c.side !== side) continue;
		if (c.primaryVp != null) parts.push(c.primaryVp);
		if (c.battleReadyVp != null) parts.push(c.battleReadyVp);
		for (const s of c.secondaries ?? []) parts.push(s.victoryPoints);
	}
	return parts.length ? parts.reduce((a, b) => a + b, 0) : null;
}

const mean = (xs: number[]): number | null =>
	xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

/**
 * Compute a warband stat block from the report log under a self filter. Pure: no I/O, inputs never
 * mutated. `self` is the warband ids the view is for (all the commander's, or a single one); a
 * report counts only when one of those warbands fought in it, scored from that side's perspective.
 *
 * `opponents`, when given, narrows to head-to-head: the game also has to have one of those warbands
 * on the *opposing* side, otherwise it is skipped entirely (not just zeroed). Omit it for the
 * field-wide block (all opponents).
 */
export function computeStatBlock(
	reports: StatReport[],
	self: Iterable<string>,
	opponents?: Iterable<string>
): StatBlock {
	const mine = new Set(self);
	const foes = opponents ? new Set(opponents) : null;

	let played = 0;
	let wins = 0;
	let draws = 0;
	let losses = 0;

	// Go-first / go-second buckets, only over games that recorded a first-turn side.
	let firstGames = 0;
	let firstWins = 0;
	let secondGames = 0;
	let secondWins = 0;

	let currentStreak = 0;
	let longestStreak = 0;

	const winVps: number[] = [];
	const lossVps: number[] = [];
	const lossDiffs: number[] = [];

	for (const r of reports) {
		// All my warbands sit on one side (a commander never fights themselves), so the first
		// self combatant fixes my side; a report with none of my warbands isn't my game.
		const mySide = r.combatants.find((c) => mine.has(c.warbandId))?.side;
		if (!mySide) continue;
		const oppSide: FoldSide = mySide === 'attacker' ? 'defender' : 'attacker';

		// Head-to-head: the game only counts when one of the named foes fought on the opposing side.
		if (foes && !r.combatants.some((c) => c.side === oppSide && foes.has(c.warbandId))) continue;

		played++;
		const won = r.outcome === mySide;
		const lost = r.outcome !== 'stalemate' && r.outcome !== mySide;

		if (won) {
			wins++;
			currentStreak++;
			if (currentStreak > longestStreak) longestStreak = currentStreak;
		} else {
			// A draw or a loss both break the run.
			currentStreak = 0;
			if (lost) losses++;
			else draws++;
		}

		if (r.wentFirst) {
			if (r.wentFirst === mySide) {
				firstGames++;
				if (won) firstWins++;
			} else {
				secondGames++;
				if (won) secondWins++;
			}
		}

		const ownVp = sideLineVp(r.combatants, mySide);
		if (won && ownVp != null) winVps.push(ownVp);
		if (lost) {
			if (ownVp != null) lossVps.push(ownVp);
			const oppVp = sideLineVp(r.combatants, oppSide);
			if (ownVp != null && oppVp != null) lossDiffs.push(oppVp - ownVp);
		}
	}

	return {
		played,
		wins,
		draws,
		losses,
		winRate: played ? wins / played : null,
		firstWinRate: firstGames ? firstWins / firstGames : null,
		secondWinRate: secondGames ? secondWins / secondGames : null,
		currentStreak,
		longestStreak,
		avgVpInWins: mean(winVps),
		avgVpInLosses: mean(lossVps),
		lossDifferential: mean(lossDiffs)
	};
}
