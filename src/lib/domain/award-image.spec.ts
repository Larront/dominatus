import { describe, it, expect } from 'vitest';
import { canWriteAwardImage } from './award-image';

describe('canWriteAwardImage', () => {
	it('lets the arbiter write any award, even one for a warband they do not command', () => {
		expect(
			canWriteAwardImage({ role: 'arbiter', userId: 'u-arb', commanderUserId: 'u-other' })
		).toBe(true);
	});

	it('lets a commander write awards for a warband they command', () => {
		expect(canWriteAwardImage({ role: 'commander', userId: 'u-me', commanderUserId: 'u-me' })).toBe(
			true
		);
	});

	it("blocks a commander from writing another commander's award", () => {
		expect(
			canWriteAwardImage({ role: 'commander', userId: 'u-me', commanderUserId: 'u-other' })
		).toBe(false);
	});

	it('blocks an anonymous viewer', () => {
		expect(canWriteAwardImage({ role: null, userId: undefined, commanderUserId: 'u-other' })).toBe(
			false
		);
	});
});
