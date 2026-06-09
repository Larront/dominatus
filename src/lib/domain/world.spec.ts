import { describe, it, expect } from 'vitest';
import { worldsHeld, type WorldWithControl } from './world';

/** A world is identified for this tally only by its derived owner; the rest is render padding. */
const world = (owner: string | null): WorldWithControl => ({
	id: `w-${owner ?? 'none'}-${Math.random()}`,
	name: 'World',
	type: 'ocean',
	value: null,
	garrison: null,
	supply: null,
	description: null,
	render: 'ocean',
	shares: [],
	derived: { owner, leader: owner, contested: owner === null, unclaimed: owner === null },
	effects: []
});

const wb = (id: string, name: string, commanderUserId = `u-${id}`) => ({
	id,
	name,
	short: id.toUpperCase(),
	color: '#fff',
	commanderUserId
});

describe('worldsHeld', () => {
	it('counts the worlds each warband outright owns', () => {
		const worlds = [world('a'), world('a'), world('b'), world(null)];
		const rows = worldsHeld(worlds, [wb('a', 'Alpha'), wb('b', 'Bravo')]);
		expect(rows.find((r) => r.id === 'a')?.held).toBe(2);
		expect(rows.find((r) => r.id === 'b')?.held).toBe(1);
	});

	it('does not credit contested or unclaimed worlds to anyone', () => {
		const rows = worldsHeld([world(null), world(null)], [wb('a', 'Alpha')]);
		expect(rows[0].held).toBe(0);
	});

	it('lists warbands strongest first, ties broken by name', () => {
		const worlds = [world('b'), world('b'), world('a'), world('c')];
		// b: 2, a: 1, c: 1 → b first, then a before c on the name tiebreak.
		const rows = worldsHeld(worlds, [wb('c', 'Cobra'), wb('a', 'Adder'), wb('b', 'Boa')]);
		expect(rows.map((r) => r.id)).toEqual(['b', 'a', 'c']);
	});

	it('flags the viewer’s own warband, and only when a viewer is given', () => {
		const worlds = [world('a')];
		const bands = [wb('a', 'Alpha', 'u-1'), wb('b', 'Bravo', 'u-2')];
		const mine = worldsHeld(worlds, bands, 'u-1');
		expect(mine.find((r) => r.id === 'a')?.you).toBe(true);
		expect(mine.find((r) => r.id === 'b')?.you).toBe(false);
		// No viewer (anonymous): nothing is "you".
		expect(worldsHeld(worlds, bands).every((r) => !r.you)).toBe(true);
	});

	it('includes warbands that hold no worlds, at the bottom', () => {
		const rows = worldsHeld([world('a')], [wb('a', 'Alpha'), wb('z', 'Zulu')]);
		expect(rows.find((r) => r.id === 'z')?.held).toBe(0);
		expect(rows.at(-1)?.id).toBe('z');
	});
});
