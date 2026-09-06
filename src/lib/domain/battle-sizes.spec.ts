import { describe, it, expect } from 'vitest';
import {
	BATTLE_SIZES,
	COMBAT_PATROL,
	battleSizeLabel,
	isBattleSize,
	isCombatPatrol,
	usesSecondaries
} from './battle-sizes';
import {
	COMBAT_PATROL_MISSIONS,
	COMBAT_PATROL_PRIMARY_MISSIONS,
	PRIMARY_MISSIONS,
	primaryMissionOptionsFor,
	primaryMissionsFor
} from './missions';

describe('battle sizes', () => {
	it('offers Combat Patrol alongside the points ladder', () => {
		expect(BATTLE_SIZES.map((s) => s.value)).toEqual([
			COMBAT_PATROL,
			'500',
			'1000',
			'1500',
			'2000'
		]);
	});

	it('keeps Combat Patrol distinct from a 500-point game', () => {
		// Same model count, different game: its own rosters, its own mission pack, no secondaries.
		expect(isCombatPatrol(COMBAT_PATROL)).toBe(true);
		expect(isCombatPatrol('500')).toBe(false);
	});

	it('recognises only the canonical values', () => {
		expect(isBattleSize('2000')).toBe(true);
		expect(isBattleSize('1250')).toBe(false);
		expect(isBattleSize('')).toBe(false);
	});

	it('scores secondaries at every size except Combat Patrol', () => {
		expect(usesSecondaries('2000')).toBe(true);
		expect(usesSecondaries(null)).toBe(true);
		expect(usesSecondaries(COMBAT_PATROL)).toBe(false);
	});
});

describe('battleSizeLabel', () => {
	it('labels a canonical size from the ladder', () => {
		expect(battleSizeLabel(COMBAT_PATROL)).toBe('Combat Patrol');
		expect(battleSizeLabel('2000')).toBe('2000 pts');
	});

	it('falls back to "<n> pts" for an off-ladder legacy size', () => {
		// The field used to be a free number; an old report keeps whatever it recorded.
		expect(battleSizeLabel('1250')).toBe('1250 pts');
	});

	it('is null when nothing was recorded, so callers can skip the line', () => {
		expect(battleSizeLabel(null)).toBeNull();
		expect(battleSizeLabel('')).toBeNull();
	});
});

describe('primaryMissionsFor', () => {
	it('gives a matched-play game the standard pack', () => {
		expect(primaryMissionsFor('2000')).toBe(PRIMARY_MISSIONS);
		expect(primaryMissionsFor(null)).toBe(PRIMARY_MISSIONS);
	});

	it('gives a Combat Patrol game its own pack', () => {
		expect(primaryMissionsFor(COMBAT_PATROL)).not.toBe(PRIMARY_MISSIONS);
	});
});

/**
 * Combat Patrol has one mission per faction rather than a shared pool, so the pack is keyed by
 * faction. Only the name reaches the report — the faction is a picker label, since a warband has
 * no recorded faction to validate against.
 */
describe('the Combat Patrol mission pack', () => {
	it('is populated', () => {
		expect(COMBAT_PATROL_MISSIONS.length).toBeGreaterThan(0);
		expect(COMBAT_PATROL_PRIMARY_MISSIONS).toHaveLength(COMBAT_PATROL_MISSIONS.length);
	});

	it('has one mission per faction, with no faction listed twice', () => {
		const factions = COMBAT_PATROL_MISSIONS.map((m) => m.faction);
		expect(new Set(factions).size).toBe(factions.length);
	});

	it('has no duplicate mission names, so a stored name identifies one mission', () => {
		// Analytics tallies by name, so a collision would merge two factions' records.
		expect(new Set(COMBAT_PATROL_PRIMARY_MISSIONS).size).toBe(
			COMBAT_PATROL_PRIMARY_MISSIONS.length
		);
	});

	it('shares no names with the matched-play pack', () => {
		const overlap = COMBAT_PATROL_PRIMARY_MISSIONS.filter((m) =>
			(PRIMARY_MISSIONS as readonly string[]).includes(m)
		);
		expect(overlap).toEqual([]);
	});
});

describe('primaryMissionOptionsFor', () => {
	it('labels a Combat Patrol option with its faction but stores the bare name', () => {
		const options = primaryMissionOptionsFor(COMBAT_PATROL);
		const orks = options.find((o) => o.value === "Duff 'em Up!");
		expect(orks).toEqual({ value: "Duff 'em Up!", label: "Orks · Duff 'em Up!" });
	});

	it('leaves a matched-play option unlabelled', () => {
		const options = primaryMissionOptionsFor('2000');
		expect(options[0]).toEqual({ value: PRIMARY_MISSIONS[0], label: PRIMARY_MISSIONS[0] });
	});
});
