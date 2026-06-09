import { describe, it, expect } from 'vitest';
import {
	generateSystem,
	ARCHETYPES,
	RENDER_KEYS,
	archetypeFor,
	MIN_WORLDS,
	MAX_WORLDS
} from './archetypes';

describe('generateSystem', () => {
	it('clamps the count to 1–6', () => {
		expect(generateSystem(0, 1)).toHaveLength(MIN_WORLDS);
		expect(generateSystem(99, 1)).toHaveLength(MAX_WORLDS);
		expect(generateSystem(NaN, 1)).toHaveLength(MIN_WORLDS);
		expect(generateSystem(4, 1)).toHaveLength(4);
	});

	it('is pure: the same seed reproduces the same system exactly', () => {
		expect(generateSystem(6, 42)).toEqual(generateSystem(6, 42));
	});

	it('varies with the seed (shuffle produces a different system)', () => {
		const a = generateSystem(6, 1).map((w) => w.name);
		const b = generateSystem(6, 2).map((w) => w.name);
		expect(a).not.toEqual(b);
	});

	it('gives every world a distinct name', () => {
		for (let seed = 0; seed < 50; seed++) {
			const names = generateSystem(MAX_WORLDS, seed).map((w) => w.name);
			expect(new Set(names).size).toBe(names.length);
		}
	});

	it('only ever rolls known render keys, and substitutes the name into the blurb', () => {
		for (const w of generateSystem(MAX_WORLDS, 7)) {
			expect(RENDER_KEYS).toContain(w.render);
			expect(w.description).not.toContain('{name}');
			expect(w.type.length).toBeGreaterThan(0);
		}
	});
});

describe('archetypeFor', () => {
	it('resolves every render key to its archetype', () => {
		for (const a of ARCHETYPES) expect(archetypeFor(a.render).render).toBe(a.render);
	});
	it('falls back to a real archetype for an unknown key', () => {
		expect(ARCHETYPES).toContain(archetypeFor('not-a-render'));
	});
});
