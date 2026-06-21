/**
 * Resolve an OCR'd mission label to a canonical mission (mission capture).
 *
 * Modelled directly on the warband matcher: the same bigram similarity and an acceptance
 * threshold, so a confident reading pre-selects the canonical mission and anything uncertain
 * is left blank for the commander to choose rather than guessed. The canonical lists live in
 * `$lib/domain/missions`; this layer only maps detected text onto them.
 */

import { similarity } from './similarity';

/** Minimum similarity (0–1) to accept a match rather than leave the field blank for manual choice. */
const MATCH_THRESHOLD = 0.6;

/**
 * The canonical mission closest to a detected label, or `undefined` when nothing clears the
 * threshold (a missing/empty label included). Picks the single best candidate — missions aren't
 * assigned one-to-one the way warbands are, since both sides can share a primary.
 */
export function matchMission(
	detected: string | undefined,
	canonical: readonly string[]
): string | undefined {
	if (!detected) return undefined;
	let best: { name: string; s: number } | undefined;
	for (const name of canonical) {
		const s = similarity(detected, name);
		if (s >= MATCH_THRESHOLD && (!best || s > best.s)) best = { name, s };
	}
	return best?.name;
}

/** Match each detected secondary name independently; uncertain reads come back `undefined`. */
export function matchSecondaries(
	detected: (string | undefined)[],
	canonical: readonly string[]
): (string | undefined)[] {
	return detected.map((d) => matchMission(d, canonical));
}
