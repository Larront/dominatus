/**
 * Battle-report image analysis seam (see ADR 0001).
 *
 * The app depends on THIS interface, never on the analyzer implementation. A draft
 * is only ever a starting point — the commander reviews, edits, and confirms it, and
 * no report is committed without that confirmation. A wrong or unavailable analysis
 * therefore degrades to manual entry rather than blocking submission.
 *
 * The real implementation will be a dedicated computer-vision stack, built later as
 * its own vertical slice. For now this is stubbed to return an empty draft.
 */

export interface ReportDraftCombatant {
	warbandId?: string;
	side: 'attacker' | 'defender';
	victoryPoints?: number;
}

export interface ReportDraft {
	worldId?: string;
	outcome?: 'attacker' | 'defender' | 'stalemate';
	pointsSize?: number;
	combatants: ReportDraftCombatant[];
	narrative?: string;
	/** 0–1 analyzer confidence, when the implementation reports it. */
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

/** The analyzer the app uses. Swap this binding when the CV stack lands. */
export const analyzer: BattleReportAnalyzer = stubAnalyzer;

export function analyzeBattleReport(image: Blob): Promise<ReportDraft> {
	return analyzer.analyze(image);
}
