/**
 * Tesseract-backed implementation of the battle-report analyzer (ADR 0001).
 *
 * The image is a standardised Tabletop Battles export, so we OCR the whole sheet once
 * and reconstruct its structure from the words' geometry rather than running layout-aware
 * computer vision. The layout, per player block:
 *
 *     <Player name>
 *     Went first        [✓]
 *     <Primary mission>     g g g g g   NN/NN     ← first scored row; total is reliable
 *     <Secondary>           g g                   ← grid cells; one block carries NN/NN
 *     …
 *     Battle Ready                       10/10
 *
 * Names, factions, and the `NN/NN` primary / battle-ready totals OCR cleanly. The sparse
 * per-round grid does not, so a secondary's points (summed from its grid cells) are the
 * least certain field — the commander reviews them. Coordinates are handled as fractions
 * of page width so the parse is independent of the export's resolution.
 */

import { MAX_SECONDARIES } from '$lib/schemas/battle-report';
import type {
	BattleReportAnalyzer,
	ReportDraft,
	ReportDraftCombatant
} from './analyze-battle-report';

/** A single OCR'd word with its pixel bounding box and 0–100 confidence. */
export interface OcrWord {
	text: string;
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	confidence: number;
}

// Column boundaries as fractions of page width (calibrated on the Tabletop Battles export):
// labels sit left, the per-round grid in the middle, the NN/NN totals hard right.
const LABEL_MAX = 0.43;
const GRID_MAX = 0.85;

const isInt = (t: string) => /^\d{1,3}$/.test(t);
const TOTAL = /^(\d{1,3})\/(\d{1,3})$/;
const WENT_FIRST = /went\s*first/i;
const BATTLE_READY = /battle\s*ready/i;

const xc = (w: OcrWord) => (w.x0 + w.x1) / 2;
const yc = (w: OcrWord) => (w.y0 + w.y1) / 2;

/** Group words into visual rows: sort by vertical centre, split where the gap exceeds half a line. */
function intoLines(words: OcrWord[]): OcrWord[][] {
	if (!words.length) return [];
	const heights = words.map((w) => w.y1 - w.y0).sort((a, b) => a - b);
	const medianH = heights[Math.floor(heights.length / 2)] || 20;
	const tol = medianH * 0.7;

	const sorted = [...words].sort((a, b) => yc(a) - yc(b));
	const lines: OcrWord[][] = [];
	let line: OcrWord[] = [];
	let lineY = -Infinity;
	for (const w of sorted) {
		if (yc(w) - lineY > tol && line.length) {
			lines.push(line);
			line = [];
		}
		line.push(w);
		lineY = yc(w);
	}
	if (line.length) lines.push(line);
	// Within each row, read left-to-right.
	for (const l of lines) l.sort((a, b) => a.x0 - b.x0);
	return lines;
}

const lineLabel = (line: OcrWord[], labelMaxX: number) =>
	line
		.filter((w) => w.x1 <= labelMaxX)
		.map((w) => w.text)
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();

/** Sum the integer grid cells of a row (the middle column band) — a secondary's approximate score. */
const gridSum = (line: OcrWord[], labelMaxX: number, gridMaxX: number) =>
	line
		.filter((w) => w.x0 > labelMaxX && w.x0 <= gridMaxX && isInt(w.text))
		.reduce((sum, w) => sum + Number(w.text), 0);

/** The `NN/NN` total on a row, if present (returns the numerator) — used for primary & battle-ready. */
function rowTotal(line: OcrWord[], gridMaxX: number): number | undefined {
	for (const w of line) {
		const m = w.text.match(TOTAL);
		if (m && w.x0 > gridMaxX) return Number(m[1]);
	}
	return undefined;
}

/**
 * Parse OCR'd words from a Tabletop Battles scoresheet into a draft. Pure and
 * resolution-independent, so it can be unit-tested against captured OCR fixtures.
 */
export function parseScoresheet(words: OcrWord[]): ReportDraft {
	return buildDraft(words).draft;
}

/** A pixel rectangle on the source image, for a targeted re-OCR of one row's grid cells. */
export interface Rect {
	left: number;
	top: number;
	width: number;
	height: number;
}

/**
 * Parse the draft AND, for each combatant, the grid-cell rectangle of every secondary row.
 * The full pass reads names and `NN/NN` totals reliably but slips on the shaded single-digit
 * grid cells, so `refineSecondaries` re-OCRs those rectangles for cleaner numbers.
 */
function buildDraft(words: OcrWord[]): { draft: ReportDraft; rects: Rect[][] } {
	const clean = words.filter((w) => w.text.trim().length);
	if (!clean.length) return { draft: { combatants: [] }, rects: [] };

	const pageWidth = Math.max(...clean.map((w) => w.x1));
	const midX = pageWidth / 2;
	const labelMaxX = pageWidth * LABEL_MAX;
	const gridMaxX = pageWidth * GRID_MAX;

	// The grid region of a row: between the labels and the right-hand totals, spanning the row's
	// own vertical band (padded a little, since a cell can sit slightly above or below its label).
	const gridRect = (line: OcrWord[]): Rect => {
		const top = Math.min(...line.map((w) => w.y0));
		const bottom = Math.max(...line.map((w) => w.y1));
		const pad = (bottom - top) * 0.2;
		return {
			left: Math.floor(labelMaxX),
			top: Math.floor(top - pad),
			width: Math.ceil(gridMaxX - labelMaxX),
			height: Math.ceil(bottom - top + 2 * pad)
		};
	};

	const lines = intoLines(clean);

	// Each player block opens with a name line directly above its "Went first" line. Find those
	// anchors, then take the nearest preceding line as the block's player-name header.
	const blockStarts: { nameLine: number; headerY: number }[] = [];
	lines.forEach((line, i) => {
		if (!WENT_FIRST.test(lineLabel(line, labelMaxX))) return;
		const nameLine = i - 1;
		if (nameLine >= 0) blockStarts.push({ nameLine, headerY: yc(lines[nameLine][0]) });
	});

	// Header factions: the line above the first block carries both factions, split by side.
	const firstBlockY = blockStarts.length ? blockStarts[0].headerY : Infinity;
	const factionLines = lines.filter((l) => yc(l[0]) < firstBlockY);
	const factionLine = [...factionLines]
		.reverse()
		.find((l) => l.some((w) => w.x0 < midX) && l.some((w) => w.x0 >= midX));
	const sideText = (left: boolean) =>
		factionLine
			? factionLine
					.filter((w) => (left ? w.x0 < midX : w.x0 >= midX))
					.map((w) => w.text)
					.join(' ')
					.trim() || undefined
			: undefined;
	const factions = [sideText(true), sideText(false)];

	const rects: Rect[][] = [];
	const combatants: ReportDraftCombatant[] = blockStarts.map((start, b) => {
		const endLine = b + 1 < blockStarts.length ? blockStarts[b + 1].nameLine : lines.length;
		const detectedName = lineLabel(lines[start.nameLine], labelMaxX) || undefined;

		const combatant: ReportDraftCombatant = {
			detectedName,
			detectedFaction: factions[b],
			secondaries: []
		};
		const combatantRects: Rect[] = [];

		// Walk the block's rows: skip until past "Went first", take the first scored row as the
		// primary, then collect secondaries until "Battle Ready" closes the block.
		let seenWentFirst = false;
		let seenPrimary = false;
		for (let i = start.nameLine + 1; i < endLine; i++) {
			const line = lines[i];
			const label = lineLabel(line, labelMaxX);
			if (!seenWentFirst) {
				if (WENT_FIRST.test(label)) seenWentFirst = true;
				continue;
			}
			if (BATTLE_READY.test(label)) {
				combatant.battleReadyVp = rowTotal(line, gridMaxX) ?? gridSum(line, labelMaxX, gridMaxX);
				break;
			}
			const total = rowTotal(line, gridMaxX);
			const grid = gridSum(line, labelMaxX, gridMaxX);
			if (!seenPrimary) {
				// First scored row is the primary; its NN/NN total is reliable and its label names
				// the primary mission (matched to the canonical list downstream).
				if (total === undefined && grid === 0 && !label) continue;
				combatant.primaryVp = total ?? grid;
				combatant.detectedPrimaryMission = label || undefined;
				seenPrimary = true;
				continue;
			}
			// A secondary: name reads cleanly, points are the (approximate) grid sum — refined later
			// by re-OCRing this row's grid rectangle. The row that also carries the block's NN/NN
			// total still counts only its own cells, never the total.
			if (label) {
				combatant.secondaries.push({ name: label, victoryPoints: grid });
				combatantRects.push(gridRect(line));
			}
		}

		// Keep every secondary row, in sheet order — including zero-scoring rows. The draft mirrors
		// the image top-to-bottom so the commander can scan down both, and a misread grid cell shows
		// up as a row to correct rather than vanishing. Slice only as a safety bound on runaway OCR.
		combatant.secondaries = combatant.secondaries.slice(0, MAX_SECONDARIES);
		rects.push(combatantRects.slice(0, MAX_SECONDARIES));

		return combatant;
	});

	const confidence = clean.reduce((sum, w) => sum + w.confidence, 0) / clean.length / 100;
	return { draft: { combatants, confidence }, rects };
}

/**
 * Re-OCR each secondary row's grid rectangle with a digit whitelist (see the analyzer below) and
 * overwrite its points with the sum of the digits found. Targeting one row's cells at a time reads
 * the shaded single digits far better than the full page does. `ocrRow` is injected so the merge
 * logic is testable without running OCR; a row that errors keeps its full-pass value.
 */
export async function refineSecondaries(
	draft: ReportDraft,
	rects: Rect[][],
	ocrRow: (rect: Rect) => Promise<string>
): Promise<void> {
	for (let i = 0; i < draft.combatants.length; i++) {
		const secondaries = draft.combatants[i].secondaries;
		for (let j = 0; j < secondaries.length; j++) {
			const rect = rects[i]?.[j];
			if (!rect) continue;
			try {
				const digits = (await ocrRow(rect)).match(/\d+/g);
				secondaries[j].victoryPoints = (digits ?? []).reduce((sum, n) => sum + Number(n), 0);
			} catch {
				// Keep the full-pass value if the targeted re-OCR fails.
			}
		}
	}
}

/** Flatten tesseract's nested block→paragraph→line→word tree into a flat word list. */
function wordsFromTesseract(data: {
	blocks?: { paragraphs?: { lines?: { words?: TessWord[] }[] }[] }[];
}): OcrWord[] {
	const out: OcrWord[] = [];
	for (const block of data.blocks ?? [])
		for (const para of block.paragraphs ?? [])
			for (const line of para.lines ?? [])
				for (const w of line.words ?? [])
					out.push({
						text: w.text,
						x0: w.bbox.x0,
						y0: w.bbox.y0,
						x1: w.bbox.x1,
						y1: w.bbox.y1,
						confidence: w.confidence
					});
	return out;
}

interface TessWord {
	text: string;
	confidence: number;
	bbox: { x0: number; y0: number; x1: number; y1: number };
}

export const tesseractAnalyzer: BattleReportAnalyzer = {
	async analyze(image) {
		const { createWorker, PSM } = await import('tesseract.js');
		const worker = await createWorker('eng');
		try {
			const buffer = Buffer.from(await image.arrayBuffer());

			// Pass 1 — full page, default config: reliable names, mission labels, and NN/NN totals.
			const full = await worker.recognize(buffer, {}, { blocks: true });
			const { draft, rects } = buildDraft(
				wordsFromTesseract(full.data as Parameters<typeof wordsFromTesseract>[0])
			);

			// Pass 2 — digits only, one secondary row's grid region at a time. Isolating a single
			// line of cells reads the shaded single digits far better than the sparse full page.
			await worker.setParameters({
				tessedit_char_whitelist: '0123456789',
				tessedit_pageseg_mode: PSM.SINGLE_LINE
			});
			await refineSecondaries(draft, rects, async (rect) => {
				const { data } = await worker.recognize(buffer, { rectangle: rect });
				return data.text;
			});

			return draft;
		} finally {
			await worker.terminate();
		}
	}
};
