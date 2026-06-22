import { describe, it, expect } from 'vitest';
import { matchMission, matchSecondaries } from './match-missions';
import { PRIMARY_MISSIONS, SECONDARY_MISSIONS } from '$lib/domain/missions';

describe('matchMission', () => {
	it('resolves a confident match to the canonical mission', () => {
		expect(matchMission('Unstoppable Force', PRIMARY_MISSIONS)).toBe('Unstoppable Force');
	});

	it('tolerates OCR slips in the label', () => {
		// l→1 — the kind of slip the full-page OCR pass makes.
		expect(matchMission('Unstoppab1e Force', PRIMARY_MISSIONS)).toBe('Unstoppable Force');
	});

	it('picks the closest canonical mission among several near-matches', () => {
		expect(matchMission('Behind Enemy Line', SECONDARY_MISSIONS)).toBe('Behind Enemy Lines');
	});

	it('leaves it blank when nothing clears the threshold', () => {
		expect(matchMission('Zxqv gibberish', PRIMARY_MISSIONS)).toBeUndefined();
	});

	it('leaves it blank for a missing or empty label', () => {
		expect(matchMission(undefined, PRIMARY_MISSIONS)).toBeUndefined();
		expect(matchMission('', SECONDARY_MISSIONS)).toBeUndefined();
	});
});

describe('matchSecondaries', () => {
	it('maps each detected name to canonical, blanking the uncertain', () => {
		// Input casing differs from canonical ("on" vs "On") — the matcher normalizes and returns
		// the canonical form; the unknown stays blank; the OCR slip resolves.
		const out = matchSecondaries(
			['Engage on All Fronts', 'Zzzz unknown', 'Assassinaton'],
			SECONDARY_MISSIONS
		);
		expect(out).toEqual(['Engage On All Fronts', undefined, 'Assassination']);
	});
});
