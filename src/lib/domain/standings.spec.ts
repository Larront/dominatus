import { describe, it, expect } from 'vitest';
import { computeStandings, type StandingsReport, type StandingBreakdown, type StandingsAward } from './standings';
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
		const log = [win('a', 'x'), win('a', 'x'), win('a', 'x'), win('a', 'x'), win('b', 'a'), win('b', 'a')];
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
		const m = score([win('a', 'b')], [
			{ warbandId: 'a', kind: 'character' }, // 2
			{ warbandId: 'a', kind: 'unit' }, // 1
			{ warbandId: 'c', kind: 'terrain' } // 1 — c never fought, appears via its award
		]);
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
		const buildKing = [win('a', 'x', { world: 'p1' }), win('a', 'x', { world: 'p1' }), win('a', 'x', { world: 'p1' })];

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
