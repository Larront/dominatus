/**
 * Battle-report image analysis seam (see ADR 0001).
 *
 * The app depends on THIS interface, never on the analyzer implementation. A draft
 * is only ever a starting point — the commander reviews, edits, and confirms it, and
 * no report is committed without that confirmation. A wrong or unavailable analysis
 * therefore degrades to manual entry rather than blocking submission.
 *
 * The image is a standardised end-of-match export from the Tabletop Battles app, so
 * the analyzer OCRs a known layout rather than running general computer vision. The
 * sheet carries each player's name, faction, and score breakdown — but NOT which side
 * attacked, which world was fought over, or the game's points size. Those are left for
 * the commander to supply during review, so this draft never invents them.
 */

export interface ReportDraftSecondary {
	name: string;
	victoryPoints: number;
}

export interface ReportDraftCombatant {
	/** OCR'd player name (e.g. "Aaron") — used to match a warband, and shown when unmatched. */
	detectedName?: string;
	/** OCR'd faction / army (e.g. "World Eaters"). */
	detectedFaction?: string;
	/**
	 * The campaign warband this player resolves to. The analyzer never sets this (it has no
	 * campaign context); the matching step fills it from `detectedName`/`detectedFaction`,
	 * leaving it blank when unsure so the commander picks.
	 */
	warbandId?: string;
	/** Primary-mission total, read from the sheet's `NN/NN` (reliable). */
	primaryVp?: number;
	/**
	 * Per-secondary scores. Names read cleanly; the points are summed from the sheet's sparse
	 * per-round grid and are the LEAST certain field — surfaced for the commander to correct.
	 */
	secondaries: ReportDraftSecondary[];
	/** Battle-ready / paint VP, read from `10/10` (reliable). */
	battleReadyVp?: number;
}

export interface ReportDraft {
	/** Players in score-sheet order; the form seats the first as attacker, the second as defender. */
	combatants: ReportDraftCombatant[];
	/** 0–1 mean OCR confidence. The grid-derived secondary points are the least certain part. */
	confidence?: number;
}

export interface BattleReportAnalyzer {
	analyze(image: Blob): Promise<ReportDraft>;
}

const emptyDraft: ReportDraft = { combatants: [] };

/** Stub analyzer — returns an empty draft so the form falls back to manual entry. */
export const stubAnalyzer: BattleReportAnalyzer = {
	async analyze() {
		return structuredClone(emptyDraft);
	}
};

/**
 * The analyzer the app uses. Lazily wraps the tesseract analyzer so the (heavy) OCR
 * stack is only loaded on the first analysis, not at server start. Swap this binding to
 * `stubAnalyzer` to force manual entry.
 */
export const analyzer: BattleReportAnalyzer = {
	async analyze(image) {
		const { tesseractAnalyzer } = await import('./tesseract-analyzer');
		return tesseractAnalyzer.analyze(image);
	}
};

export function analyzeBattleReport(image: Blob): Promise<ReportDraft> {
	return analyzer.analyze(image);
}
