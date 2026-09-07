import { describe, it, expect } from 'vitest';
import {
	computeStandings,
	type StandingsReport,
	type StandingBreakdown,
	type StandingsAward
} from './standings';
import { DEFAULT_PROFILE, type ScoringProfile } from './scoring-profile';

/** Terse builders so the sequences read as a campaign, not object soup. World defaults to 'w'. */
const win = (
	winner: string,
	loser: string,
	opts: { world?: string; narrative?: boolean } = {}
): StandingsReport => ({
	worldId: opts.world ?? 'w',
	outcome: 'attacker',
	hasNarrative: opts.narrative ?? false,
	combatants: [
		{ warbandId: winner, side: 'attacker' },
		{ warbandId: loser, side: 'defender' }
	]
});
const draw = (
	a: string,
	b: string,
	opts: { world?: string; narrative?: boolean } = {}
): StandingsReport => ({
	worldId: opts.world ?? 'w',
	outcome: 'stalemate',
	hasNarrative: opts.narrative ?? false,
	combatants: [
		{ warbandId: a, side: 'attacker' },
		{ warbandId: b, side: 'defender' }
	]
});

const profile = (overrides: Partial<ScoringProfile> = {}): ScoringProfile => ({
	...DEFAULT_PROFILE,
	...overrides
});
/** Score with the default profile unless a test supplies its own. */
const score = (reports: StandingsReport[], awards: StandingsAward[] = [], p = DEFAULT_PROFILE) =>
	computeStandings(reports, awards, p);

const obj = (m: Map<string, StandingBreakdown>) => Object.fromEntries(m);
/** Just the total for each warband, for the many assertions that only care about the sum. */
const totals = (m: Map<string, StandingBreakdown>) =>
	Object.fromEntries([...m].map(([k, v]) => [k, v.total]));

describe('computeStandings', () => {
	it('is empty with no reports and no awards', () => {
		expect(obj(score([]))).toEqual({});
	});

	it('awards 3 for a win and nothing to the loser (loss off by default)', () => {
		const m = score([win('a', 'b')]);
		expect(m.get('a')).toMatchObject({ win: 3, total: 3 });
		expect(m.has('b')).toBe(false); // a loser with no other points doesn't appear
	});

	it('awards 1 to each side on a draw', () => {
		expect(totals(score([draw('a', 'b')]))).toEqual({ a: 1, b: 1 });
	});

	it('gives no underdog bonus on a first, uncontested win (both at 0%)', () => {
		expect(score([win('a', 'b')]).get('a')?.underdog).toBe(0);
	});

	it('gives +1 underdog when the winner beats a bigger holder', () => {
		const m = score([win('b', 'a'), win('b', 'a'), win('a', 'b')]);
		expect(m.get('a')).toMatchObject({ win: 3, underdog: 1, total: 4 });
		expect(m.get('b')).toMatchObject({ win: 6, underdog: 0, milestone: 1, total: 7 });
	});

	it('gives narrative +1 to BOTH combatants when a report carries a narrative', () => {
		const m = score([win('a', 'b', { narrative: true })]);
		expect(m.get('a')).toMatchObject({ win: 3, narrative: 1, total: 4 });
		expect(m.get('b')).toMatchObject({ win: 0, narrative: 1, total: 1 });
	});

	it('banks milestone points at +1 per 20% reached, even after losing ground', () => {
		const log = [
			win('a', 'x'),
			win('a', 'x'),
			win('a', 'x'),
			win('a', 'x'),
			win('b', 'a'),
			win('b', 'a')
		];
		expect(score(log).get('a')?.milestone).toBe(2);
	});

	it('counts milestones per world, summed across the campaign', () => {
		const m = score([
			win('a', 'x', { world: 'p1' }),
			win('a', 'x', { world: 'p1' }),
			win('a', 'y', { world: 'p2' }),
			win('a', 'y', { world: 'p2' })
		]);
		expect(m.get('a')?.milestone).toBe(2);
	});

	it('layers painting awards on top, scored live from the profile by kind', () => {
		const m = score(
			[win('a', 'b')],
			[
				{ warbandId: 'a', kind: 'character' }, // 2
				{ warbandId: 'a', kind: 'unit' }, // 1
				{ warbandId: 'c', kind: 'terrain' } // 1 — c never fought, appears via its award
			]
		);
		expect(m.get('a')).toMatchObject({ win: 3, painting: 3, total: 6 });
		expect(m.get('c')).toMatchObject({ painting: 1, total: 1 });
	});

	it('scores by the campaign profile, not a global constant', () => {
		const m = score([win('a', 'b'), draw('a', 'b')], [], profile({ win: 5, draw: 2 }));
		// a: win 5 + draw 2 = 7; b: draw 2
		expect(m.get('a')).toMatchObject({ win: 5, draw: 2, total: 7 });
		expect(m.get('b')).toMatchObject({ draw: 2, total: 2 });
	});

	describe('loss', () => {
		it('grants the loss value to each warband on the losing side of a decisive game', () => {
			const m = score([win('a', 'b')], [], profile({ loss: 2 }));
			expect(m.get('b')).toMatchObject({ loss: 2, total: 2 });
		});
		it('does not grant loss on a stalemate', () => {
			const m = score([draw('a', 'b')], [], profile({ loss: 2 }));
			expect(m.get('a')?.loss).toBe(0);
			expect(m.get('b')?.loss).toBe(0);
		});
	});

	describe('win streak', () => {
		const p = profile({ win: 0, streakBonus: 5, streakLength: 3 });
		it('pays the bounty on the Nth consecutive win', () => {
			expect(score([win('a', 'x'), win('a', 'x')], [], p).get('a')?.streak ?? 0).toBe(0);
			expect(score([win('a', 'x'), win('a', 'x'), win('a', 'x')], [], p).get('a')?.streak).toBe(5);
		});
		it('is repeatable — pays again every Nth win', () => {
			const log = Array.from({ length: 6 }, () => win('a', 'x'));
			expect(score(log, [], p).get('a')?.streak).toBe(10);
		});
		it('resets on a draw', () => {
			const m = score([win('a', 'x'), win('a', 'x'), draw('a', 'y'), win('a', 'x')], [], p);
			expect(m.get('a')?.streak ?? 0).toBe(0);
		});
		it('resets on a loss', () => {
			const m = score([win('a', 'x'), win('a', 'x'), win('b', 'a'), win('a', 'x')], [], p);
			expect(m.get('a')?.streak ?? 0).toBe(0);
		});
	});

	describe('kingkiller', () => {
		// Build a's run on p1 (so control there doesn't touch the toppling world p2), threshold 3.
		const p = profile({ kingkiller: 4, streakLength: 3, win: 3, underdog: 0 });
		const buildKing = [
			win('a', 'x', { world: 'p1' }),
			win('a', 'x', { world: 'p1' }),
			win('a', 'x', { world: 'p1' })
		];

		it('rewards beating a warband on a reigning run', () => {
			const m = score([...buildKing, win('b', 'a', { world: 'p2' })], [], p);
			expect(m.get('b')).toMatchObject({ kingkiller: 4 });
		});
		it('does not reward beating a warband below the run threshold', () => {
			const m = score([win('a', 'x', { world: 'p1' }), win('b', 'a', { world: 'p2' })], [], p);
			expect(m.get('b')?.kingkiller ?? 0).toBe(0);
		});
		it('rewards the side that DRAWS a king (stopping the run without a win)', () => {
			// a (king) on attacker draws b on defender → b stopped the run.
			const m = score([...buildKing, draw('a', 'b', { world: 'p2' })], [], p);
			expect(m.get('b')?.kingkiller).toBe(4);
			expect(m.get('a')?.kingkiller ?? 0).toBe(0);
		});
	});

	describe('2v2', () => {
		const team = (
			w1: string,
			w2: string,
			l1: string,
			l2: string,
			opts: { narrative?: boolean } = {}
		): StandingsReport => ({
			worldId: 'w',
			outcome: 'attacker',
			hasNarrative: opts.narrative ?? false,
			combatants: [
				{ warbandId: w1, side: 'attacker' },
				{ warbandId: w2, side: 'attacker' },
				{ warbandId: l1, side: 'defender' },
				{ warbandId: l2, side: 'defender' }
			]
		});

		it('awards the win to each warband on the winning side', () => {
			const m = score([team('a', 'b', 'c', 'd')]);
			expect(m.get('a')).toMatchObject({ win: 3, total: 3 });
			expect(m.get('b')).toMatchObject({ win: 3, total: 3 });
			expect(m.has('c')).toBe(false);
		});

		it('gives narrative to all four combatants', () => {
			const m = score([team('a', 'b', 'c', 'd', { narrative: true })]);
			expect(m.get('c')?.narrative).toBe(1);
			expect(m.get('d')?.narrative).toBe(1);
		});
	});
});

describe('uneven sides and outside opponents', () => {
	/** An uneven or guest-bearing report. Guests are already dropped by the caller's fold. */
	const report = (
		attackers: string[],
		defenders: string[],
		outcome: 'attacker' | 'defender' | 'stalemate',
		opts: { world?: string; narrative?: boolean } = {}
	): StandingsReport => ({
		worldId: opts.world ?? 'w',
		outcome,
		hasNarrative: opts.narrative ?? false,
		combatants: [
			...attackers.map((warbandId) => ({ warbandId, side: 'attacker' as const })),
			...defenders.map((warbandId) => ({ warbandId, side: 'defender' as const }))
		]
	});

	it('pays every warband on the winning side of a 2v1', () => {
		const m = score([report(['a', 'b'], ['c'], 'attacker')]);
		expect(m.get('a')).toMatchObject({ win: 3, total: 3 });
		expect(m.get('b')).toMatchObject({ win: 3, total: 3 });
	});

	it('pays the lone winner of a 1v2 a single win, not one per opponent', () => {
		expect(score([report(['a'], ['b', 'c'], 'attacker')]).get('a')).toMatchObject({
			win: 3,
			total: 3
		});
	});

	it('pays a loss to every warband on the losing side of a 1v2', () => {
		const m = score([report(['a'], ['b', 'c'], 'defender')], [], profile({ loss: 1 }));
		expect(m.get('a')).toMatchObject({ loss: 1 });
		expect(m.get('b')).toMatchObject({ win: 3 });
		expect(m.get('c')).toMatchObject({ win: 3 });
	});

	it('gives underdog in a 1v2 when ANY opponent held a bigger share', () => {
		const m = score([win('b', 'z'), win('b', 'z'), report(['a'], ['b', 'c'], 'attacker')]);
		expect(m.get('a')).toMatchObject({ win: 3, underdog: 1 });
	});

	it('narrative pays every warband in an uneven report', () => {
		const m = score([report(['a'], ['b', 'c'], 'attacker', { narrative: true })]);
		expect(m.get('a')?.narrative).toBe(1);
		expect(m.get('b')?.narrative).toBe(1);
		expect(m.get('c')?.narrative).toBe(1);
	});

	// A game against someone outside the league reaches the fold as a one-sided report: the
	// guest is already filtered out (see foldCombatants), so the warband is alone on its side.
	it('pays a full win for beating an outside opponent', () => {
		expect(score([report(['a'], [], 'attacker')]).get('a')).toMatchObject({ win: 3, total: 3 });
	});

	it('pays a full draw against an outside opponent', () => {
		expect(score([report(['a'], [], 'stalemate')]).get('a')).toMatchObject({ draw: 1, total: 1 });
	});

	it('pays a loss for losing to an outside opponent', () => {
		expect(score([report(['a'], [], 'defender')], [], profile({ loss: 1 })).get('a')).toMatchObject(
			{ loss: 1, total: 1 }
		);
	});

	it('never scores the guest — only the warband appears', () => {
		expect(Object.keys(totals(score([report(['a'], [], 'attacker')])))).toEqual(['a']);
	});

	it('counts a guest game towards a warband win streak', () => {
		const p = profile({ streakBonus: 5, streakLength: 3 });
		const m = score([win('a', 'b'), report(['a'], [], 'attacker'), win('a', 'b')], [], p);
		expect(m.get('a')?.streak).toBe(5);
	});

	it('breaks a streak when a warband loses to a guest', () => {
		const p = profile({ streakBonus: 5, streakLength: 2 });
		const m = score([win('a', 'b'), report(['a'], [], 'defender'), win('a', 'b')], [], p);
		// Win, then the guest loss resets the run, so the third game is only run #1 — no bounty.
		expect(m.get('a')?.streak).toBe(0);
	});

	it('banks control milestones from ground taken off a guest', () => {
		const p = profile({ milestonePoints: 1, milestoneStep: 20 });
		const m = score([report(['a'], [], 'attacker'), report(['a'], [], 'attacker')], [], p);
		expect(m.get('a')?.milestone).toBe(1);
	});

	it('gives no underdog against a guest — an outsider holds no ground to be bigger', () => {
		expect(score([report(['a'], [], 'attacker')]).get('a')?.underdog).toBe(0);
	});
});
