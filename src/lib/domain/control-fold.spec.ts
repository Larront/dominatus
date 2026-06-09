import { describe, it, expect } from 'vitest';
import { foldControl, applyReport, type FoldReport } from './control-fold';

/** Terse builders so the sequences below read as a campaign, not as object soup. */
const v1 = (winner: string, loser: string): FoldReport => ({
	outcome: 'attacker',
	combatants: [
		{ warbandId: winner, side: 'attacker' },
		{ warbandId: loser, side: 'defender' }
	]
});
const draw = (a: string, b: string): FoldReport => ({
	outcome: 'stalemate',
	combatants: [
		{ warbandId: a, side: 'attacker' },
		{ warbandId: b, side: 'defender' }
	]
});
const obj = (m: Map<string, number>) => Object.fromEntries(m);

describe('foldControl', () => {
	it('leaves the world uncontested with no reports', () => {
		expect(obj(foldControl([]))).toEqual({});
	});

	it('claims 10% out of the uncontested pool on the first win', () => {
		// Loser had nothing to give, so the winner's 10 comes from the pool.
		expect(obj(foldControl([v1('a', 'b')]))).toEqual({ a: 10 });
	});

	it('transfers 10% loser→winner once the loser holds ground', () => {
		const log = [v1('a', 'b'), v1('a', 'b'), v1('b', 'a')];
		// a: +10 +10 -10 = 10 ; b: 0 0 then +10 from a = 10
		expect(obj(foldControl(log))).toEqual({ a: 10, b: 10 });
	});

	it('moves no control on a stalemate', () => {
		expect(obj(foldControl([v1('a', 'b'), draw('a', 'b')]))).toEqual({ a: 10 });
	});

	it('floors a loser at 0 rather than going negative', () => {
		expect(obj(foldControl([v1('a', 'b'), v1('a', 'b')]))).toEqual({ a: 20 });
	});

	it('builds a majority owner over a run of wins', () => {
		const log = Array.from({ length: 6 }, () => v1('a', 'b'));
		expect(obj(foldControl(log))).toEqual({ a: 60 });
	});

	it('never lets the world exceed 100% even as it fills', () => {
		// Ten distinct warbands each beat a fresh 0% opponent — naive +10s would total 110%.
		const log = Array.from({ length: 11 }, (_, i) => v1(`w${i}`, `loser${i}`));
		const result = foldControl(log);
		const sum = [...result.values()].reduce((s, n) => s + n, 0);
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
		// pool is 40 here; push it to 0 by giving a,b,c more, then a final a-win
		const top = [v1('a', 'x'), v1('a', 'x'), v1('b', 'x'), v1('b', 'x')]; // a40 b40 c20 → sum100
		const result = foldControl([...fill, ...top, v1('a', 'x')]);
		const sum = [...result.values()].reduce((s, n) => s + n, 0);
		expect(sum).toBe(100);
		// x never held anything, so the final a-win has no pool to draw from: a stays 40.
		expect(result.get('a')).toBe(40);
	});

	describe('applyReport (single step, used for client preview)', () => {
		it('does not mutate the input snapshot', () => {
			const current = new Map([['a', 30]]);
			const result = applyReport(current, v1('a', 'b'));
			expect(obj(current)).toEqual({ a: 30 }); // unchanged
			expect(obj(result)).toEqual({ a: 40 });
		});

		it('returns the snapshot unchanged on a stalemate', () => {
			const current = new Map([['a', 30]]);
			expect(obj(applyReport(current, draw('a', 'b')))).toEqual({ a: 30 });
		});
	});

	describe('2v2', () => {
		const team = (w1: string, w2: string, l1: string, l2: string): FoldReport => ({
			outcome: 'attacker',
			combatants: [
				{ warbandId: w1, side: 'attacker' },
				{ warbandId: w2, side: 'attacker' },
				{ warbandId: l1, side: 'defender' },
				{ warbandId: l2, side: 'defender' }
			]
		});

		it('moves 10% per warband — the winning side pulls 20% off the world', () => {
			expect(obj(foldControl([team('a', 'b', 'c', 'd')]))).toEqual({ a: 10, b: 10 });
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
			const result = foldControl([...build, team('a', 'b', 'c', 'd')]);
			const sum = [...result.values()].reduce((s, n) => s + n, 0);
			expect(sum).toBeLessThanOrEqual(100);
		});
	});
});
