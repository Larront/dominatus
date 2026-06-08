import { describe, it, expect } from 'vitest';
import { deriveControl } from './control';

describe('deriveControl', () => {
	it('reports unclaimed when no warband holds any share', () => {
		expect(deriveControl([])).toEqual({
			owner: null,
			leader: null,
			contested: false,
			unclaimed: true
		});
	});

	it('names an owner when one warband holds a majority', () => {
		const result = deriveControl([
			{ warbandId: 'a', share: 64 },
			{ warbandId: 'b', share: 21 },
			{ warbandId: 'c', share: 15 }
		]);
		expect(result.owner).toBe('a');
		expect(result.contested).toBe(false);
		expect(result.unclaimed).toBe(false);
	});

	it('is contested when the leader lacks a majority', () => {
		const result = deriveControl([
			{ warbandId: 'a', share: 44 },
			{ warbandId: 'b', share: 39 },
			{ warbandId: 'c', share: 17 }
		]);
		expect(result.owner).toBeNull();
		expect(result.leader).toBe('a');
		expect(result.contested).toBe(true);
	});

	it('treats exactly 50% as contested, not owned', () => {
		const result = deriveControl([
			{ warbandId: 'a', share: 50 },
			{ warbandId: 'b', share: 50 }
		]);
		expect(result.owner).toBeNull();
		expect(result.contested).toBe(true);
	});
});
