/**
 * Campaign-wide mission analytics (issue #13) — win rate and average score grouped by **primary
 * mission** and by **secondary mission**, over the whole battle-report log. Like standings, control,
 * and the warband stat block, it is a pure derivation: nothing is stored, the breakdown is rebuilt on
 * read, so an arbiter report edit simply re-derives it.
 *
 * The unit of observation is a **side**, not a report: each side declares its own primary mission and
 * runs its own secondaries (CONTEXT: Mission), so a single 1v1 report contributes two primary
 * observations — one per side — each grouped under that side's own mission and scored win/draw/loss
 * from that side's perspective.
 *
 * **Average score** is the VP earned *on that mission*: a primary group averages the side's recorded
 * primary VP, a secondary group averages that secondary's own VP. Win rate is over every side that
 * *ran* the mission (draws sit in the denominator, as in the stat block); the average is over only the
 * sides that *recorded a score*, so an unrecorded VP still counts a played game without dragging the
 * average to zero.
 *
 * Both breakdowns are constrained to the current edition's canonical set (CONTEXT: Mission — "the
 * picker and, later, analytics constrains entries to the canonical set"). A side with no recorded
 * primary mission, or one carrying a retired / off-list name, is excluded from the primary breakdown;
 * an off-list or unrecognized secondary is excluded from the secondary breakdown. Storage stays free
 * text, so the constraint lives here rather than in the column.
 */

import type { FoldSide } from './control-fold';
import { isPrimaryMission, isSecondaryMission } from './missions';

/** A combatant reduced to side identity, its side's primary mission, and recorded mission scores. */
export interface MissionCombatant {
	side: FoldSide;
	/** This side's primary mission (the lead carries it in 2v2). Null/empty when not recorded. */
	primaryMission: string | null;
	/** Primary-mission VP. Null when not recorded. */
	primaryVp: number | null;
	/** This side's secondary scores, free-text names. Null when none recorded. */
	secondaries: { name: string; victoryPoints: number }[] | null;
}

/** A battle report reduced to what the analytics read. Order does not matter — nothing here is sequential. */
export interface MissionReport {
	outcome: FoldSide | 'stalemate';
	combatants: MissionCombatant[];
}

/** Win rate and average score for one mission, over every side that ran it. */
export interface MissionStat {
	mission: string;
	played: number;
	wins: number;
	draws: number;
	losses: number;
	/** wins / played — always defined, since an emitted entry has at least one played game. */
	winRate: number;
	/** Mean VP scored on this mission across sides that recorded one; null when none did. */
	avgScore: number | null;
}

/** The campaign's mission analytics: a primary breakdown and a secondary breakdown. */
export interface MissionAnalytics {
	primaries: MissionStat[];
	secondaries: MissionStat[];
}

/** A running tally per mission, finalized into a {@link MissionStat}. */
interface Tally {
	played: number;
	wins: number;
	draws: number;
	losses: number;
	scoreSum: number;
	scoreCount: number;
}

const blank = (): Tally => ({
	played: 0,
	wins: 0,
	draws: 0,
	losses: 0,
	scoreSum: 0,
	scoreCount: 0
});

/** Record one side's outcome (and optional score) against a mission's tally. */
function record(
	tallies: Map<string, Tally>,
	mission: string,
	result: 'win' | 'draw' | 'loss',
	score: number | null
): void {
	const t = tallies.get(mission) ?? blank();
	t.played++;
	if (result === 'win') t.wins++;
	else if (result === 'draw') t.draws++;
	else t.losses++;
	if (score != null) {
		t.scoreSum += score;
		t.scoreCount++;
	}
	tallies.set(mission, t);
}

/** Finalize a mission→tally map into a breakdown, ordered by games played desc then mission name. */
function finalize(tallies: Map<string, Tally>): MissionStat[] {
	return [...tallies.entries()]
		.map(([mission, t]) => ({
			mission,
			played: t.played,
			wins: t.wins,
			draws: t.draws,
			losses: t.losses,
			winRate: t.wins / t.played,
			avgScore: t.scoreCount ? t.scoreSum / t.scoreCount : null
		}))
		.sort((a, b) => b.played - a.played || a.mission.localeCompare(b.mission));
}

/** This side's primary mission — the first non-empty one declared on the side (the lead carries it). */
function sidePrimaryMission(combatants: MissionCombatant[], side: FoldSide): string | null {
	for (const c of combatants) {
		if (c.side !== side) continue;
		const m = c.primaryMission?.trim();
		if (m) return m;
	}
	return null;
}

/** This side's primary VP — summed over the side (only the lead records it); null if none did. */
function sidePrimaryVp(combatants: MissionCombatant[], side: FoldSide): number | null {
	let sum = 0;
	let any = false;
	for (const c of combatants) {
		if (c.side !== side) continue;
		if (c.primaryVp != null) {
			sum += c.primaryVp;
			any = true;
		}
	}
	return any ? sum : null;
}

const resultFor = (outcome: MissionReport['outcome'], side: FoldSide): 'win' | 'draw' | 'loss' =>
	outcome === 'stalemate' ? 'draw' : outcome === side ? 'win' : 'loss';

const SIDES: FoldSide[] = ['attacker', 'defender'];

/**
 * Compute campaign mission analytics from the battle-report log. Pure: no I/O, inputs never mutated.
 * Each side that ran a canonical primary mission contributes one primary observation; each canonical
 * secondary a side ran contributes one secondary observation. Off-list and unrecorded missions are
 * skipped (see the module note).
 */
export function computeMissionAnalytics(reports: MissionReport[]): MissionAnalytics {
	const primaries = new Map<string, Tally>();
	const secondaries = new Map<string, Tally>();

	for (const report of reports) {
		// Primary: one observation per side, grouped under that side's own primary mission.
		for (const side of SIDES) {
			const mission = sidePrimaryMission(report.combatants, side);
			if (!mission || !isPrimaryMission(mission)) continue;
			record(
				primaries,
				mission,
				resultFor(report.outcome, side),
				sidePrimaryVp(report.combatants, side)
			);
		}

		// Secondary: one observation per canonical secondary a combatant ran, scored by its side.
		for (const c of report.combatants) {
			const result = resultFor(report.outcome, c.side);
			for (const s of c.secondaries ?? []) {
				const name = s.name?.trim();
				if (!name || !isSecondaryMission(name)) continue;
				record(secondaries, name, result, s.victoryPoints);
			}
		}
	}

	return { primaries: finalize(primaries), secondaries: finalize(secondaries) };
}
