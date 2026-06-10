import { describe, it, expect } from 'vitest';
import { matchWarbands, type WarbandIdentity } from './match-warbands';

const warbands: WarbandIdentity[] = [
	{ id: 'w-aaron', name: 'World Eaters', short: 'WE', commanderName: 'Aaron' },
	{ id: 'w-chris', name: 'Space Marines', short: 'SM', commanderName: 'Chris' },
	{ id: 'w-bob', name: 'Necrons', short: 'NEC', commanderName: 'Bob' }
];

describe('matchWarbands', () => {
	it('matches players to warbands by commander name', () => {
		const ids = matchWarbands([{ detectedName: 'Aaron' }, { detectedName: 'Chris' }], warbands);
		expect(ids).toEqual(['w-aaron', 'w-chris']);
	});

	it('falls back to faction → warband name when the player name is unknown', () => {
		const ids = matchWarbands([{ detectedFaction: 'World Eaters' }], warbands);
		expect(ids).toEqual(['w-aaron']);
	});

	it('tolerates OCR slips in the name', () => {
		const ids = matchWarbands([{ detectedName: 'Aaroan' }], warbands);
		expect(ids).toEqual(['w-aaron']);
	});

	it('leaves a warband blank when nothing clears the threshold', () => {
		const ids = matchWarbands([{ detectedName: 'Zxqv' }], warbands);
		expect(ids).toEqual([undefined]);
	});

	it('never assigns the same warband to two players', () => {
		// Two players both reading as "Aaron" must not both grab w-aaron.
		const ids = matchWarbands([{ detectedName: 'Aaron' }, { detectedName: 'Aaron' }], warbands);
		expect(ids[0]).toBe('w-aaron');
		expect(ids[1]).toBeUndefined();
	});
});
