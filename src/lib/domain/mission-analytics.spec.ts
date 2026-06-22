import { describe, it, expect } from 'vitest';
import {
	computeMissionAnalytics,
	type MissionReport,
	type MissionCombatant,
	type MissionStat
} from './mission-analytics';

/**
 * Terse builders. A side declares its own primary mission and an optional secondary list; a report
 * pairs an attacker side against a defender side with an outcome. `r('attacker', …)` is a win for the
 * attacker side, `r('defender', …)` a win for the defender, `r('stalemate', …)` a draw for both.
 */
const side = (
	side: 'attacker' | 'defender',
	opts: {
		primary?: string | null;
		primaryVp?: number | null;
		secondaries?: { name: string; victoryPoints: number }[] | null;
	} = {}
): MissionCombatant => ({
	side,
	primaryMission: opts.primary ?? null,
	primaryVp: opts.primaryVp ?? null,
	secondaries: opts.secondaries ?? null
});

const r = (
	outcome: 'attacker' | 'defender' | 'stalemate',
	attacker: MissionCombatant,
	defender: MissionCombatant
): MissionReport => ({ outcome, combatants: [attacker, defender] });

// Canonical names used across the tests (see $lib/domain/missions).
const VITAL = 'Vital Link';
const SABOTAGE = 'Sabotage';
const TRIANGULATION = 'Triangulation';
const ASSASSINATION = 'Assassination';
const CLEANSE = 'Cleanse';
const PLUNDER = 'Plunder';

const find = (stats: MissionStat[], mission: string) => stats.find((s) => s.mission === mission);

describe('computeMissionAnalytics', () => {
	it('is empty with no reports', () => {
		const a = computeMissionAnalytics([]);
		expect(a.primaries).toEqual([]);
		expect(a.secondaries).toEqual([]);
	});

	describe('primary missions', () => {
		it('groups by primary mission and scores win rate from each side perspective', () => {
			const a = computeMissionAnalytics([
				r(
					'attacker',
					side('attacker', { primary: VITAL }),
					side('defender', { primary: SABOTAGE })
				),
				r('defender', side('attacker', { primary: VITAL }), side('defender', { primary: SABOTAGE }))
			]);
			const vital = find(a.primaries, VITAL)!;
			expect(vital.played).toBe(2);
			expect(vital.wins).toBe(1);
			expect(vital.losses).toBe(1);
			expect(vital.winRate).toBeCloseTo(0.5);

			const sabotage = find(a.primaries, SABOTAGE)!;
			expect(sabotage.played).toBe(2);
			expect(sabotage.wins).toBe(1);
			expect(sabotage.winRate).toBeCloseTo(0.5);
		});

		it('evaluates each side primary independently within one report', () => {
			const a = computeMissionAnalytics([
				r('attacker', side('attacker', { primary: VITAL }), side('defender', { primary: SABOTAGE }))
			]);
			expect(find(a.primaries, VITAL)!.winRate).toBeCloseTo(1); // the side that won
			expect(find(a.primaries, SABOTAGE)!.winRate).toBeCloseTo(0); // the side that lost
		});

		it('excludes a side with no recorded primary mission', () => {
			const a = computeMissionAnalytics([
				r('attacker', side('attacker', { primary: VITAL }), side('defender'))
			]);
			expect(a.primaries.map((s) => s.mission)).toEqual([VITAL]);
		});

		it('treats an empty-string primary as not recorded', () => {
			const a = computeMissionAnalytics([
				r('attacker', side('attacker', { primary: '' }), side('defender', { primary: SABOTAGE }))
			]);
			expect(a.primaries.map((s) => s.mission)).toEqual([SABOTAGE]);
		});

		it('excludes an off-list primary mission', () => {
			const a = computeMissionAnalytics([
				r(
					'attacker',
					side('attacker', { primary: 'Not A Real Mission' }),
					side('defender', { primary: SABOTAGE })
				)
			]);
			expect(a.primaries.map((s) => s.mission)).toEqual([SABOTAGE]);
		});

		it('averages the primary VP scored under the mission', () => {
			const a = computeMissionAnalytics([
				r(
					'attacker',
					side('attacker', { primary: VITAL, primaryVp: 40 }),
					side('defender', { primary: SABOTAGE })
				),
				r(
					'defender',
					side('attacker', { primary: VITAL, primaryVp: 60 }),
					side('defender', { primary: SABOTAGE })
				)
			]);
			expect(find(a.primaries, VITAL)!.avgScore).toBeCloseTo(50);
		});

		it('still counts a played game for win rate when no VP was recorded, leaving avgScore null', () => {
			const a = computeMissionAnalytics([
				r('attacker', side('attacker', { primary: VITAL }), side('defender', { primary: SABOTAGE }))
			]);
			const vital = find(a.primaries, VITAL)!;
			expect(vital.played).toBe(1);
			expect(vital.avgScore).toBeNull();
		});

		it('counts a draw as played but not a win', () => {
			const a = computeMissionAnalytics([
				r('stalemate', side('attacker', { primary: VITAL }), side('defender', { primary: VITAL }))
			]);
			const vital = find(a.primaries, VITAL)!;
			expect(vital.played).toBe(2);
			expect(vital.wins).toBe(0);
			expect(vital.draws).toBe(2);
			expect(vital.losses).toBe(0);
			expect(vital.winRate).toBeCloseTo(0);
		});

		it('sums the lead primary VP across a 2v2 side', () => {
			const report: MissionReport = {
				outcome: 'attacker',
				combatants: [
					{ side: 'attacker', primaryMission: VITAL, primaryVp: 45, secondaries: null },
					{ side: 'attacker', primaryMission: null, primaryVp: null, secondaries: null },
					{ side: 'defender', primaryMission: SABOTAGE, primaryVp: 30, secondaries: null },
					{ side: 'defender', primaryMission: null, primaryVp: null, secondaries: null }
				]
			};
			const a = computeMissionAnalytics([report]);
			expect(find(a.primaries, VITAL)!.played).toBe(1);
			expect(find(a.primaries, VITAL)!.avgScore).toBeCloseTo(45);
		});
	});

	describe('secondary missions', () => {
		it('groups by secondary, scoring win rate from the running side and averaging that secondary VP', () => {
			const a = computeMissionAnalytics([
				r(
					'attacker',
					side('attacker', {
						primary: VITAL,
						secondaries: [
							{ name: ASSASSINATION, victoryPoints: 5 },
							{ name: CLEANSE, victoryPoints: 3 }
						]
					}),
					side('defender', {
						primary: SABOTAGE,
						secondaries: [{ name: ASSASSINATION, victoryPoints: 2 }]
					})
				)
			]);
			const assassination = find(a.secondaries, ASSASSINATION)!;
			expect(assassination.played).toBe(2); // both sides ran it
			expect(assassination.wins).toBe(1); // the winning attacker side
			expect(assassination.winRate).toBeCloseTo(0.5);
			expect(assassination.avgScore).toBeCloseTo(3.5); // (5 + 2) / 2

			const cleanse = find(a.secondaries, CLEANSE)!;
			expect(cleanse.played).toBe(1);
			expect(cleanse.winRate).toBeCloseTo(1);
			expect(cleanse.avgScore).toBeCloseTo(3);
		});

		it('excludes off-list / unrecognized secondaries', () => {
			const a = computeMissionAnalytics([
				r(
					'attacker',
					side('attacker', {
						primary: VITAL,
						secondaries: [
							{ name: 'Made Up Secondary', victoryPoints: 9 },
							{ name: PLUNDER, victoryPoints: 4 }
						]
					}),
					side('defender', { primary: SABOTAGE })
				)
			]);
			expect(a.secondaries.map((s) => s.mission)).toEqual([PLUNDER]);
		});

		it('counts a zero-VP secondary as played with a recorded score', () => {
			const a = computeMissionAnalytics([
				r(
					'defender',
					side('attacker', { primary: VITAL, secondaries: [{ name: PLUNDER, victoryPoints: 0 }] }),
					side('defender', { primary: SABOTAGE })
				)
			]);
			const plunder = find(a.secondaries, PLUNDER)!;
			expect(plunder.played).toBe(1);
			expect(plunder.wins).toBe(0); // the attacker side lost
			expect(plunder.avgScore).toBeCloseTo(0);
		});
	});

	describe('ordering', () => {
		it('orders by games played descending, then mission name ascending', () => {
			const a = computeMissionAnalytics([
				// Sabotage played 3 times, Vital Link once.
				r(
					'attacker',
					side('attacker', { primary: SABOTAGE }),
					side('defender', { primary: VITAL })
				),
				r(
					'attacker',
					side('attacker', { primary: SABOTAGE }),
					side('defender', { primary: TRIANGULATION })
				),
				r(
					'defender',
					side('attacker', { primary: TRIANGULATION }),
					side('defender', { primary: SABOTAGE })
				)
			]);
			// Sabotage (3) first; Triangulation and Vital Link tie at 1 → alphabetical.
			expect(a.primaries.map((s) => s.mission)).toEqual([SABOTAGE, TRIANGULATION, VITAL]);
		});
	});
});
