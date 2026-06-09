import { describe, it, expect } from 'vitest';
import { replay, applyReport, type FoldReport, type FoldStep } from './control-fold';

/** Terse builders so the sequences below read as a campaign, not as object soup. World defaults to 'w'. */
const v1 = (winner: string, loser: string, world = 'w'): FoldReport => ({
	worldId: world,
	outcome: 'attacker',
	combatants: [
		{ warbandId: winner, side: 'attacker' },
		{ warbandId: loser, side: 'defender' }
	]
});
const draw = (a: string, b: string, world = 'w'): FoldReport => ({
	worldId: world,
	outcome: 'stalemate',
	combatants: [
		{ warbandId: a, side: 'attacker' },
		{ warbandId: b, side: 'defender' }
	]
});
const obj = (m: Map<string, number> | undefined) => Object.fromEntries(m ?? new Map());
/** Replay a single world's reports and read its final shares — the per-world fold Control does. */
const fold = (reports: FoldReport[], world = 'w') => replay(reports).final.get(world) ?? new Map();

describe('replay — single world fold (final shares)', () => {
	it('leaves the world uncontested with no reports', () => {
		expect(replay([]).final.size).toBe(0);
	});

	it('claims 10% out of the uncontested pool on the first win', () => {
		// Loser had nothing to give, so the winner's 10 comes from the pool.
		expect(obj(fold([v1('a', 'b')]))).toEqual({ a: 10 });
	});

	it('transfers 10% loser→winner once the loser holds ground', () => {
		const log = [v1('a', 'b'), v1('a', 'b'), v1('b', 'a')];
		// a: +10 +10 -10 = 10 ; b: 0 0 then +10 from a = 10
		expect(obj(fold(log))).toEqual({ a: 10, b: 10 });
	});

	it('moves no control on a stalemate', () => {
		expect(obj(fold([v1('a', 'b'), draw('a', 'b')]))).toEqual({ a: 10 });
	});

	it('floors a loser at 0 rather than going negative', () => {
		expect(obj(fold([v1('a', 'b'), v1('a', 'b')]))).toEqual({ a: 20 });
	});

	it('builds a majority owner over a run of wins', () => {
		const log = Array.from({ length: 6 }, () => v1('a', 'b'));
		expect(obj(fold(log))).toEqual({ a: 60 });
	});

	it('never lets the world exceed 100% even as it fills', () => {
		// Ten distinct warbands each beat a fresh 0% opponent — naive +10s would total 110%.
		const log = Array.from({ length: 11 }, (_, i) => v1(`w${i}`, `loser${i}`));
		const sum = [...fold(log).values()].reduce((s, n) => s + n, 0);
		expect(sum).toBeLessThanOrEqual(100);
	});

	it('caps the winner once the pool is empty', () => {
		// Fill the world to 100% across a,b,c then let a win again — no headroom to gain.
		const fill = [
			v1('a', 'x'),
			v1('a', 'x'), // a 20
			v1('b', 'x'),
			v1('b', 'x'), // b 20
			v1('c', 'x'),
			v1('c', 'x') // c 20
		];
		// pool is 40 here; push it to 0 by giving a,b more, then a final a-win
		const top = [v1('a', 'x'), v1('a', 'x'), v1('b', 'x'), v1('b', 'x')]; // a40 b40 c20 → sum100
		const result = fold([...fill, ...top, v1('a', 'x')]);
		const sum = [...result.values()].reduce((s, n) => s + n, 0);
		expect(sum).toBe(100);
		// x never held anything, so the final a-win has no pool to draw from: a stays 40.
		expect(result.get('a')).toBe(40);
	});
});

describe('replay — multi-world bucketing', () => {
	it('keeps each world independent in final', () => {
		// a wins on p1, b wins on p2 — neither touches the other's shares.
		const r = replay([v1('a', 'b', 'p1'), v1('b', 'a', 'p2')]);
		expect(obj(r.final.get('p1'))).toEqual({ a: 10 });
		expect(obj(r.final.get('p2'))).toEqual({ b: 10 });
	});

	it('threads each world by its own history regardless of interleaving order', () => {
		// p1: a wins twice (→20). p2: a wins once (→10). Interleaved across the log.
		const r = replay([
			v1('a', 'x', 'p1'),
			v1('a', 'x', 'p2'),
			v1('a', 'x', 'p1')
		]);
		expect(r.final.get('p1')?.get('a')).toBe(20);
		expect(r.final.get('p2')?.get('a')).toBe(10);
	});
});

describe('replay — per-step before/after', () => {
	it('emits one step per report, in input order', () => {
		const log = [v1('a', 'b'), v1('a', 'b')];
		expect(replay(log).steps).toHaveLength(2);
	});

	it('exposes the world shares before and after each report', () => {
		const [first, second] = replay([v1('a', 'b'), v1('a', 'b')]).steps;
		expect(obj(first.pre)).toEqual({}); // first report: world starts uncontested
		expect(obj(first.post)).toEqual({ a: 10 });
		expect(obj(second.pre)).toEqual({ a: 10 }); // second sees the first's result
		expect(obj(second.post)).toEqual({ a: 20 });
	});

	it('reports pre per world, not globally', () => {
		// a is at 20 on p1 when it first fights on p2 — p2's pre must be empty, not 20.
		const steps = replay([v1('a', 'x', 'p1'), v1('a', 'x', 'p1'), v1('a', 'y', 'p2')]).steps;
		expect(obj(steps[2].pre)).toEqual({});
	});

	it('does not mutate an emitted snapshot on later steps', () => {
		const steps = replay([v1('a', 'b'), v1('a', 'b')]).steps;
		// The first step's post is the second step's pre; applying the second must not have mutated it.
		expect(obj(steps[0].post)).toEqual({ a: 10 });
	});
});

describe('applyReport (single step, used for client preview)', () => {
	// Preview passes a worldless FoldStep — the seam the report page depends on.
	const step = (winner: string, loser: string): FoldStep => ({
		outcome: 'attacker',
		combatants: [
			{ warbandId: winner, side: 'attacker' },
			{ warbandId: loser, side: 'defender' }
		]
	});

	it('does not mutate the input snapshot', () => {
		const current = new Map([['a', 30]]);
		const result = applyReport(current, step('a', 'b'));
		expect(obj(current)).toEqual({ a: 30 }); // unchanged
		expect(obj(result)).toEqual({ a: 40 });
	});

	it('returns the snapshot unchanged on a stalemate', () => {
		const current = new Map([['a', 30]]);
		const stalemate: FoldStep = { outcome: 'stalemate', combatants: [] };
		expect(obj(applyReport(current, stalemate))).toEqual({ a: 30 });
	});
});

describe('replay — 2v2', () => {
	const team = (w1: string, w2: string, l1: string, l2: string, world = 'w'): FoldReport => ({
		worldId: world,
		outcome: 'attacker',
		combatants: [
			{ warbandId: w1, side: 'attacker' },
			{ warbandId: w2, side: 'attacker' },
			{ warbandId: l1, side: 'defender' },
			{ warbandId: l2, side: 'defender' }
		]
	});

	it('moves 10% per warband — the winning side pulls 20% off the world', () => {
		expect(obj(fold([team('a', 'b', 'c', 'd')]))).toEqual({ a: 10, b: 10 });
	});

	it('keeps the world ≤100% when a near-full world swings', () => {
		// Build a, b, c, d up, then a 2v2 where the cap must bite.
		const build = [
			v1('a', 'z'),
			v1('a', 'z'),
			v1('a', 'z'), // a30
			v1('b', 'z'),
			v1('b', 'z'), // b20
			v1('c', 'z'),
			v1('c', 'z'), // c20
			v1('d', 'z'),
			v1('d', 'z') // d20 → sum 90, pool 10
		];
		const sum = [...fold([...build, team('a', 'b', 'c', 'd')]).values()].reduce((s, n) => s + n, 0);
		expect(sum).toBeLessThanOrEqual(100);
	});
});
