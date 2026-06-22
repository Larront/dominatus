/**
 * Resolve an OCR'd scoresheet player to a campaign warband (ADR 0001).
 *
 * The scoresheet names a *player* and their *faction*; a warband is commanded by a user
 * and has its own name. So we match the player name against the commander's name, and the
 * faction against the warband's name/tag, taking the strongest signal. A confident match
 * pre-selects the warband; anything uncertain is left blank for the commander to pick —
 * the draft never guesses an identity it isn't sure of.
 */

import { similarity } from './similarity';

export interface WarbandIdentity {
	id: string;
	name: string;
	short: string;
	commanderName: string;
}

export interface DetectedIdentity {
	detectedName?: string;
	detectedFaction?: string;
}

/** Minimum similarity (0–1) to accept a match rather than leave the warband for manual choice. */
const MATCH_THRESHOLD = 0.6;

/** Best similarity of a detected combatant against one warband, across the signals we have. */
function score(detected: DetectedIdentity, w: WarbandIdentity): number {
	const pairs: [string | undefined, string][] = [
		[detected.detectedName, w.commanderName],
		[detected.detectedFaction, w.name],
		[detected.detectedFaction, w.short]
	];
	return Math.max(0, ...pairs.map(([d, c]) => (d ? similarity(d, c) : 0)));
}

/**
 * Map each detected combatant to a campaign warband id (or `undefined` when no candidate
 * clears the threshold). Assignment is greedy by descending confidence and one-to-one, so
 * two players can never resolve to the same warband.
 */
export function matchWarbands(
	detected: DetectedIdentity[],
	warbands: WarbandIdentity[]
): (string | undefined)[] {
	// Every (player, warband) pair scored, strongest first.
	const ranked = detected
		.flatMap((d, di) => warbands.map((w) => ({ di, id: w.id, s: score(d, w) })))
		.filter((c) => c.s >= MATCH_THRESHOLD)
		.sort((a, b) => b.s - a.s);

	const result: (string | undefined)[] = detected.map(() => undefined);
	const takenWarband = new Set<string>();
	for (const c of ranked) {
		if (result[c.di] !== undefined || takenWarband.has(c.id)) continue;
		result[c.di] = c.id;
		takenWarband.add(c.id);
	}
	return result;
}
