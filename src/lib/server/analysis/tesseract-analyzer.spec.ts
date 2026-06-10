import { describe, it, expect } from 'vitest';
import { parseScoresheet, refineSecondaries, type OcrWord, type Rect } from './tesseract-analyzer';
import fixtureWords from './scoresheet-fixture.json';

/**
 * The fixture is the real OCR output for docs/samples/scoresheet.png (captured by
 * scripts/ocr-dump.mjs), so this exercises the parser against actual tesseract noise —
 * no OCR runs here. Regenerate the fixture if the sample or OCR version changes.
 */
const draft = parseScoresheet(fixtureWords as OcrWord[]);

describe('parseScoresheet on a Tabletop Battles export', () => {
	it('finds both players in sheet order, with names and factions', () => {
		expect(draft.combatants.map((c) => c.detectedName)).toEqual(['Aaron', 'Chris']);
		expect(draft.combatants.map((c) => c.detectedFaction)).toEqual([
			'World Eaters',
			'Space Marines'
		]);
	});

	it('reads the reliable primary and battle-ready totals', () => {
		expect(draft.combatants[0].primaryVp).toBe(45);
		expect(draft.combatants[0].battleReadyVp).toBe(10);
		expect(draft.combatants[1].primaryVp).toBe(45);
		expect(draft.combatants[1].battleReadyVp).toBe(10);
	});

	it('captures every secondary row, in sheet order, with clean names', () => {
		// All eleven rows from each block — including zero-scoring ones — so the draft mirrors the
		// image and a misread cell surfaces as a row to fix rather than disappearing.
		expect(draft.combatants[0].secondaries.map((s) => s.name)).toEqual([
			'Beacon',
			'Centre Ground',
			'Behind Enemy Lines',
			'Burden of Trust',
			'Display of Might',
			'Defend Stronghold',
			'A Tempting Target',
			'Cleanse',
			'Outflank',
			'Engage On All Fronts',
			'No Prisoners'
		]);
		expect(draft.combatants[1].secondaries.map((s) => s.name)).toEqual([
			'Bring It Down',
			'Cleanse',
			'Display of Might',
			'Defend Stronghold',
			'Behind Enemy Lines',
			'Forward Position',
			'Burden of Trust',
			'Overwhelming Force',
			'No Prisoners',
			'Beacon',
			'Outflank'
		]);
		for (const c of draft.combatants) {
			expect(c.secondaries.every((s) => /^[A-Za-z][A-Za-z '-]*$/.test(s.name))).toBe(true);
			expect(c.secondaries.every((s) => s.victoryPoints >= 0)).toBe(true);
		}
	});

	it('gives a sensible full-pass fallback for the grid cells (before digit refinement)', () => {
		// These are the full-page-pass sums — the fallback used if the digit pass fails. The analyzer
		// re-OCRs each row's grid region (see refineSecondaries) for the cells the full page slips on.
		const aaron = new Map(draft.combatants[0].secondaries.map((s) => [s.name, s.victoryPoints]));
		expect(aaron.get('Centre Ground')).toBe(3);
		expect(aaron.get('Behind Enemy Lines')).toBe(5);
		expect(aaron.get('Burden of Trust')).toBe(2);
		expect(aaron.get('Cleanse')).toBe(5);
		expect(aaron.get('Outflank')).toBe(5);
		// Genuinely-zero rows stay zero, not dropped.
		expect(aaron.get('No Prisoners')).toBe(0);

		const chris = new Map(draft.combatants[1].secondaries.map((s) => [s.name, s.victoryPoints]));
		expect(chris.get('Bring It Down')).toBe(5);
		expect(chris.get('Forward Position')).toBe(5);
		expect(chris.get('No Prisoners')).toBe(5);
	});

	it('reports a confidence in the unit range', () => {
		expect(draft.confidence).toBeGreaterThan(0);
		expect(draft.confidence).toBeLessThanOrEqual(1);
	});
});

describe('refineSecondaries', () => {
	const rect = (top: number): Rect => ({ left: 0, top, width: 10, height: 10 });
	const makeDraft = () => ({
		combatants: [
			{
				secondaries: [
					{ name: 'A', victoryPoints: 9 },
					{ name: 'B', victoryPoints: 9 },
					{ name: 'C', victoryPoints: 9 }
				]
			}
		]
	});

	it('overwrites each row with the digit sum from the targeted re-OCR', async () => {
		const draft = makeDraft();
		const rects = [[rect(0), rect(20), rect(40)]];
		const byTop: Record<number, string> = { 0: '5', 20: '- 3', 40: '' };
		await refineSecondaries(draft, rects, async (r) => byTop[r.top]);
		expect(draft.combatants[0].secondaries.map((s) => s.victoryPoints)).toEqual([5, 3, 0]);
	});

	it('sums multiple cells in a row (e.g. the primary-style grid)', async () => {
		const draft = { combatants: [{ secondaries: [{ name: 'A', victoryPoints: 0 }] }] };
		await refineSecondaries(draft, [[rect(0)]], async () => '3 10 14 10 12');
		expect(draft.combatants[0].secondaries[0].victoryPoints).toBe(49);
	});

	it('keeps the full-pass value when a row re-OCR throws', async () => {
		const draft = makeDraft();
		await refineSecondaries(draft, [[rect(0), rect(20), rect(40)]], async () => {
			throw new Error('ocr failed');
		});
		expect(draft.combatants[0].secondaries.map((s) => s.victoryPoints)).toEqual([9, 9, 9]);
	});
});
