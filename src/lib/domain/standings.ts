/**
 * Leaderboard points (ADR 0003). Separate from world control (ADR 0002): control is the map,
 * standings are the points. Most points are *derived* by folding the campaign's battle reports —
 * the same ordered replay control uses — and painting is added on top as discrete arbiter awards.
 *
 * Two categories need the control context, which is why this isn't a stateless sum of results:
 *   - **Underdog** reads each combatant's share *before* the battle (you beat someone bigger).
 *   - **Milestones** read the *max* share ever reached on a world (banked, never lost).
 * So this reads the same per-world `replay` Control reads, and layers the points on top of each
 * report's before/after shares. Like control, the result is a pure function of the ordered log
 * plus awards — recomputed on read.
 */

import { replay, type FoldReport } from './control-fold';
import type { ScoringProfile } from './scoring-profile';

/**
 * The default derived point values — the seed for a new campaign's Scoring Profile (ADR 0004) and
 * the values the rules page falls back to. The live fold no longer reads these; it reads the
 * per-campaign profile passed to `computeStandings`. Kept here so `DEFAULT_PROFILE` has one source.
 */
export const POINTS = {
	win: 3,
	draw: 1,
	/** Beating a warband that held a higher share on the contested world at battle time. */
	underdog: 1,
	/** A report carrying a narrative — to every combatant warband, both sides. */
	narrative: 1
} as const;

/** Default painting award value by kind — the seed for the profile's painting values. */
export const PAINTING_POINTS = { unit: 1, character: 2, terrain: 1 } as const;
export type PaintingKind = keyof typeof PAINTING_POINTS;

/**
 * A battle report shaped for the standings fold: a `FoldReport` (the same shape Control replays)
 * plus whether it carries a narrative. Order is the same fold order as control.
 */
export interface StandingsReport extends FoldReport {
	/** Whether the report carries a narrative — earns every combatant +1. */
	hasNarrative: boolean;
}

/** A painting award reduced to its warband and kind; its points are read from the profile. */
export interface StandingsAward {
	warbandId: string;
	kind: PaintingKind;
}

/** Per-warband point breakdown by category, plus the total. */
export interface StandingBreakdown {
	win: number;
	draw: number;
	underdog: number;
	narrative: number;
	loss: number;
	milestone: number;
	streak: number;
	kingkiller: number;
	painting: number;
	total: number;
}

function blank(): StandingBreakdown {
	return {
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
}

const paintingValue = (profile: ScoringProfile, kind: PaintingKind): number =>
	kind === 'unit'
		? profile.paintUnit
		: kind === 'character'
			? profile.paintCharacter
			: profile.paintTerrain;

/**
 * Fold a campaign's reports (chronological — the same order control uses) plus its awards into a
 * per-warband point breakdown, scored by the campaign's profile (ADR 0004). Only warbands that
 * earned something appear; the caller zero-fills the full roster. Pure: no I/O, input never mutated.
 *
 * Most categories are stateless within a report. Two are sequential and read state from *before*
 * the report is applied:
 *   - **Underdog** — beating a foe who held a higher control share on the world (pre-fold shares).
 *   - **Kingkiller** — ending another warband's reigning *win streak* (run ≥ profile.streakLength,
 *     read before this report); awarded for a win over a king, or to the side that drew a king.
 * And **win streak** itself is a campaign-wide per-warband run of consecutive decisive wins: a
 * bounty every `streakLength`-th win, reset by a draw or a loss.
 */
export function computeStandings(
	reports: StandingsReport[],
	awards: StandingsAward[],
	profile: ScoringProfile
): Map<string, StandingBreakdown> {
	const points = new Map<string, StandingBreakdown>();
	const add = (warbandId: string, key: keyof StandingBreakdown, n: number) => {
		if (n === 0) return;
		const b = points.get(warbandId) ?? blank();
		b[key] += n;
		b.total += n;
		points.set(warbandId, b);
	};

	// The one replay Control also reads: each step carries its world's shares before/after the
	// report. We read those rather than threading control here, so points and the map never diverge.
	const { steps } = replay(reports);
	// Highest share each warband has ever held on each world — milestones are banked off this.
	const maxByWorld = new Map<string, Map<string, number>>();
	// Campaign-wide consecutive-decisive-win run per warband, for streak + kingkiller.
	const streak = new Map<string, number>();
	const runLength = Math.max(2, profile.streakLength);
	const isKing = (warbandId: string) => (streak.get(warbandId) ?? 0) >= runLength;

	for (let i = 0; i < reports.length; i++) {
		const r = reports[i];
		// `pre` = shares before this report (underdog reads it); `post` = after (milestones bank it).
		const { pre, post } = steps[i];
		const attackers = r.combatants.filter((c) => c.side === 'attacker');
		const defenders = r.combatants.filter((c) => c.side === 'defender');

		if (r.outcome === 'stalemate') {
			for (const c of r.combatants) add(c.warbandId, 'draw', profile.draw);

			// Kingkiller on a draw: stopping a king's run counts even without a win. The side opposite
			// the king is the one that stopped it; two kings drawing pays both (read before the reset).
			const attackerKing = attackers.some((c) => isKing(c.warbandId));
			const defenderKing = defenders.some((c) => isKing(c.warbandId));
			if (defenderKing)
				for (const c of attackers) add(c.warbandId, 'kingkiller', profile.kingkiller);
			if (attackerKing)
				for (const c of defenders) add(c.warbandId, 'kingkiller', profile.kingkiller);

			// A draw breaks the streak for everyone in it.
			for (const c of r.combatants) streak.set(c.warbandId, 0);
		} else {
			const winners = r.combatants.filter((c) => c.side === r.outcome);
			const losers = r.combatants.filter((c) => c.side !== r.outcome);
			// Kingkiller (read pre-fold): beating anyone who was on a reigning run.
			const toppledAKing = losers.some((l) => isKing(l.warbandId));

			for (const w of winners) {
				add(w.warbandId, 'win', profile.win);
				const myShare = pre.get(w.warbandId) ?? 0;
				if (losers.some((l) => (pre.get(l.warbandId) ?? 0) > myShare)) {
					add(w.warbandId, 'underdog', profile.underdog);
				}
				if (toppledAKing) add(w.warbandId, 'kingkiller', profile.kingkiller);

				// Extend the run; the bounty lands every `runLength`-th consecutive win.
				const run = (streak.get(w.warbandId) ?? 0) + 1;
				streak.set(w.warbandId, run);
				if (run % runLength === 0) add(w.warbandId, 'streak', profile.streakBonus);
			}
			for (const l of losers) {
				add(l.warbandId, 'loss', profile.loss);
				streak.set(l.warbandId, 0);
			}
		}

		// Narrative rewards documenting the battle, so every combatant earns it — not just one side.
		if (r.hasNarrative) {
			for (const c of r.combatants) add(c.warbandId, 'narrative', profile.narrative);
		}

		const mx = maxByWorld.get(r.worldId) ?? new Map<string, number>();
		for (const [warbandId, share] of post) {
			mx.set(warbandId, Math.max(mx.get(warbandId) ?? 0, share));
		}
		maxByWorld.set(r.worldId, mx);
	}

	// Milestones: profile.milestonePoints per profile.milestoneStep% ever held on a world, banked.
	const step = Math.max(1, profile.milestoneStep);
	for (const mx of maxByWorld.values()) {
		for (const [warbandId, max] of mx) {
			add(warbandId, 'milestone', Math.floor(max / step) * profile.milestonePoints);
		}
	}

	// Arbiter painting awards, scored live from the profile by kind (ADR 0004 — no snapshot).
	for (const a of awards) add(a.warbandId, 'painting', paintingValue(profile, a.kind));

	return points;
}
