import { describe, it, expect } from 'vitest';
import { computeStatBlock, type StatReport, type StatCombatant } from './stat-block';

/**
 * Terse builders so a sequence reads as a campaign, not object soup. By default the viewer's
 * warband is `me` on the attacker side and the foe is `opp` on the defender side — so `g('attacker')`
 * is a win for me, `g('defender')` a loss, `g('stalemate')` a draw. A bare combatant records no VP.
 */
const combatant = (
	warbandId: string,
	side: 'attacker' | 'defender',
	vp?: number
): StatCombatant => ({
	warbandId,
	side,
	primaryVp: vp ?? null,
	battleReadyVp: null,
	secondaries: null
});

const g = (
	outcome: 'attacker' | 'defender' | 'stalemate',
	opts: {
		meVp?: number;
		oppVp?: number;
		wentFirst?: 'attacker' | 'defender' | null;
		me?: string;
	} = {}
): StatReport => ({
	outcome,
	wentFirst: opts.wentFirst ?? null,
	combatants: [
		combatant(opts.me ?? 'me', 'attacker', opts.meVp),
		combatant('opp', 'defender', opts.oppVp)
	]
});

const SELF = ['me'];

describe('computeStatBlock', () => {
	it('is empty with no games', () => {
		const b = computeStatBlock([], SELF);
		expect(b.played).toBe(0);
		expect(b.wins).toBe(0);
		expect(b.draws).toBe(0);
		expect(b.losses).toBe(0);
		expect(b.winRate).toBeNull();
	});

	it('ignores games the self filter is not part of', () => {
		const b = computeStatBlock([g('attacker', { me: 'someone-else' })], SELF);
		expect(b.played).toBe(0);
	});

	it('counts played, W/D/L from the viewer perspective', () => {
		const b = computeStatBlock([g('attacker'), g('defender'), g('stalemate'), g('attacker')], SELF);
		expect(b.played).toBe(4);
		expect(b.wins).toBe(2);
		expect(b.losses).toBe(1);
		expect(b.draws).toBe(1);
	});

	it('counts a loss when the viewer is on the losing side', () => {
		// Viewer plays defender and loses (attacker won).
		const report: StatReport = {
			outcome: 'attacker',
			wentFirst: null,
			combatants: [combatant('opp', 'attacker'), combatant('me', 'defender')]
		};
		const b = computeStatBlock([report], SELF);
		expect(b.wins).toBe(0);
		expect(b.losses).toBe(1);
	});

	it('computes win rate as wins / played', () => {
		const b = computeStatBlock([g('attacker'), g('attacker'), g('defender'), g('stalemate')], SELF);
		expect(b.winRate).toBeCloseTo(0.5);
	});

	describe('go-first / go-second win rate', () => {
		it('is null when no game recorded a first-turn side', () => {
			const b = computeStatBlock([g('attacker'), g('defender')], SELF);
			expect(b.firstWinRate).toBeNull();
			expect(b.secondWinRate).toBeNull();
		});

		it('splits win rate by whether the viewer went first', () => {
			const b = computeStatBlock(
				[
					g('attacker', { wentFirst: 'attacker' }), // went first, won
					g('defender', { wentFirst: 'attacker' }), // went first, lost
					g('attacker', { wentFirst: 'defender' }), // went second, won
					g('attacker', { wentFirst: 'defender' }) // went second, won
				],
				SELF
			);
			expect(b.firstWinRate).toBeCloseTo(0.5); // 1 of 2
			expect(b.secondWinRate).toBeCloseTo(1); // 2 of 2
		});

		it('only counts games with a recorded first-turn side in the denominator', () => {
			const b = computeStatBlock([g('attacker', { wentFirst: 'attacker' }), g('defender')], SELF);
			expect(b.firstWinRate).toBeCloseTo(1); // the one recorded go-first game, won
			expect(b.secondWinRate).toBeNull();
		});
	});

	describe('streaks', () => {
		it('current streak counts consecutive wins ending at the most recent game', () => {
			const b = computeStatBlock([g('defender'), g('attacker'), g('attacker')], SELF);
			expect(b.currentStreak).toBe(2);
		});

		it('a draw or loss resets the current streak', () => {
			expect(
				computeStatBlock([g('attacker'), g('attacker'), g('stalemate')], SELF).currentStreak
			).toBe(0);
			expect(
				computeStatBlock([g('attacker'), g('attacker'), g('defender')], SELF).currentStreak
			).toBe(0);
		});

		it('longest streak is the best run over the whole history', () => {
			const b = computeStatBlock(
				[g('attacker'), g('attacker'), g('attacker'), g('defender'), g('attacker')],
				SELF
			);
			expect(b.longestStreak).toBe(3);
			expect(b.currentStreak).toBe(1);
		});

		it('interleaves all-my-warbands games into one personal streak (chronological)', () => {
			// Two of my warbands, a and b, each win in turn — one continuous personal streak of 3.
			const b = computeStatBlock(
				[g('attacker', { me: 'a' }), g('attacker', { me: 'b' }), g('attacker', { me: 'a' })],
				['a', 'b']
			);
			expect(b.currentStreak).toBe(3);
			expect(b.longestStreak).toBe(3);
		});
	});

	describe('average VP', () => {
		it('averages own-line total VP over wins, and over losses', () => {
			const b = computeStatBlock(
				[
					g('attacker', { meVp: 80 }),
					g('attacker', { meVp: 60 }),
					g('defender', { meVp: 30 }),
					g('defender', { meVp: 50 })
				],
				SELF
			);
			expect(b.avgVpInWins).toBeCloseTo(70);
			expect(b.avgVpInLosses).toBeCloseTo(40);
		});

		it('sums the score components into the own-line total', () => {
			const report: StatReport = {
				outcome: 'attacker',
				wentFirst: null,
				combatants: [
					{
						warbandId: 'me',
						side: 'attacker',
						primaryVp: 40,
						battleReadyVp: 10,
						secondaries: [{ victoryPoints: 5 }, { victoryPoints: 5 }]
					},
					combatant('opp', 'defender')
				]
			};
			expect(computeStatBlock([report], SELF).avgVpInWins).toBeCloseTo(60);
		});

		it('is null when no game in the bucket recorded any VP', () => {
			const b = computeStatBlock([g('attacker'), g('defender')], SELF);
			expect(b.avgVpInWins).toBeNull();
			expect(b.avgVpInLosses).toBeNull();
		});

		it('skips games with no recorded VP from the average', () => {
			const b = computeStatBlock([g('attacker', { meVp: 90 }), g('attacker')], SELF);
			expect(b.avgVpInWins).toBeCloseTo(90); // only the recorded game counts
		});
	});

	describe('loss differential', () => {
		it('is the mean of (opponent line VP − own line VP) across losses', () => {
			const b = computeStatBlock(
				[
					g('defender', { meVp: 40, oppVp: 70 }), // diff +30
					g('defender', { meVp: 50, oppVp: 60 }) // diff +10
				],
				SELF
			);
			expect(b.lossDifferential).toBeCloseTo(20);
		});

		it('only considers losses, not wins or draws', () => {
			const b = computeStatBlock(
				[g('attacker', { meVp: 90, oppVp: 10 }), g('defender', { meVp: 20, oppVp: 50 })],
				SELF
			);
			expect(b.lossDifferential).toBeCloseTo(30); // only the loss
		});

		it('is null when no loss recorded both sides VP', () => {
			const b = computeStatBlock([g('defender', { meVp: 20 })], SELF);
			expect(b.lossDifferential).toBeNull();
		});

		it('in 2v2 compares against the opposing side line (its shared team score)', () => {
			// 2v2: my side's lead carries our team score; the opposing side's lead carries theirs.
			const report: StatReport = {
				outcome: 'defender', // the opposing (defender) side won → a loss for me
				wentFirst: null,
				combatants: [
					combatant('me', 'attacker', 45), // our lead carries the team score
					combatant('ally', 'attacker'), // teammate, no separate score
					combatant('opp1', 'defender', 75), // their lead carries the team score
					combatant('opp2', 'defender') // their teammate, no separate score
				]
			};
			expect(computeStatBlock([report], SELF).lossDifferential).toBeCloseTo(30);
			expect(computeStatBlock([report], SELF).avgVpInLosses).toBeCloseTo(45);
		});
	});

	describe('self filter', () => {
		it('narrows to a single warband when the filter names just one', () => {
			const reports = [g('attacker', { me: 'a' }), g('defender', { me: 'b' })];
			const onlyA = computeStatBlock(reports, ['a']);
			expect(onlyA.played).toBe(1);
			expect(onlyA.wins).toBe(1);
			expect(onlyA.losses).toBe(0);

			const both = computeStatBlock(reports, ['a', 'b']);
			expect(both.played).toBe(2);
			expect(both.wins).toBe(1);
			expect(both.losses).toBe(1);
		});
	});

	describe('head-to-head (opponent filter)', () => {
		// A foe builder: `me` plays a named opponent. With no opponent filter all three count; the
		// filter narrows to just the games against the named foe.
		const vs = (
			outcome: 'attacker' | 'defender' | 'stalemate',
			foe: string,
			opts: { meVp?: number; oppVp?: number } = {}
		): StatReport => ({
			outcome,
			wentFirst: null,
			combatants: [combatant('me', 'attacker', opts.meVp), combatant(foe, 'defender', opts.oppVp)]
		});

		it('omitting opponents keeps the field-wide block (all opponents)', () => {
			const b = computeStatBlock([vs('attacker', 'rax'), vs('defender', 'kael')], SELF);
			expect(b.played).toBe(2);
			expect(b.wins).toBe(1);
			expect(b.losses).toBe(1);
		});

		it('narrows to only games against the named foe', () => {
			const reports = [vs('attacker', 'rax'), vs('defender', 'kael'), vs('attacker', 'rax')];
			const h2h = computeStatBlock(reports, SELF, ['rax']);
			expect(h2h.played).toBe(2);
			expect(h2h.wins).toBe(2);
			expect(h2h.losses).toBe(0);
			expect(h2h.winRate).toBeCloseTo(1);
		});

		it('treats the opponent filter as a whole commander (any of their warbands)', () => {
			// Kael commands two warbands; the head-to-head against Kael folds both.
			const reports = [vs('attacker', 'kael-1'), vs('defender', 'kael-2'), vs('attacker', 'rax')];
			const h2h = computeStatBlock(reports, SELF, ['kael-1', 'kael-2']);
			expect(h2h.played).toBe(2);
			expect(h2h.wins).toBe(1);
			expect(h2h.losses).toBe(1);
		});

		it('skips the game entirely when the foe is absent — not merely zeroed', () => {
			// Streaks and averages re-derive over the slice: the win vs rax is the only game, so the
			// loss vs kael never touches the current streak.
			const reports = [vs('defender', 'kael'), vs('attacker', 'rax')];
			const h2h = computeStatBlock(reports, SELF, ['rax']);
			expect(h2h.played).toBe(1);
			expect(h2h.currentStreak).toBe(1);
		});

		it('recomputes VP and loss differential over the narrowed slice', () => {
			const reports = [
				vs('defender', 'rax', { meVp: 40, oppVp: 70 }), // loss vs rax, diff +30
				vs('defender', 'kael', { meVp: 10, oppVp: 90 }) // loss vs kael — excluded
			];
			const h2h = computeStatBlock(reports, SELF, ['rax']);
			expect(h2h.avgVpInLosses).toBeCloseTo(40);
			expect(h2h.lossDifferential).toBeCloseTo(30);
		});

		it('only counts the foe on the opposing side, never as a teammate', () => {
			// `me` and `rax` fight on the same side (2v2 allies). A head-to-head vs rax must find no
			// games — you never face a teammate.
			const report: StatReport = {
				outcome: 'attacker',
				wentFirst: null,
				combatants: [
					combatant('me', 'attacker'),
					combatant('rax', 'attacker'),
					combatant('opp1', 'defender'),
					combatant('opp2', 'defender')
				]
			};
			expect(computeStatBlock([report], SELF, ['rax']).played).toBe(0);
			expect(computeStatBlock([report], SELF, ['opp1']).played).toBe(1);
		});
	});
});
