/**
 * Resolve an OCR'd scoresheet player to a campaign warband (ADR 0001).
 *
 * The scoresheet names a *player* and their *faction*; a warband is commanded by a user
 * and has its own name. So we match the player name against the commander's name, and the
 * faction against the warband's name/tag, taking the strongest signal. A confident match
 * pre-selects the warband; anything uncertain is left blank for the commander to pick —
 * the draft never guesses an identity it isn't sure of.
 */

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

const normalize = (s: string) =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();

/** Sørensen–Dice similarity over character bigrams — forgiving of OCR slips and spelling drift. */
function similarity(a: string, b: string): number {
	const x = normalize(a);
	const y = normalize(b);
	if (!x || !y) return 0;
	if (x === y) return 1;
	if (x.length < 2 || y.length < 2) return x === y ? 1 : 0;

	const bigrams = (s: string) => {
		const m = new Map<string, number>();
		for (let i = 0; i < s.length - 1; i++) {
			const g = s.slice(i, i + 2);
			m.set(g, (m.get(g) ?? 0) + 1);
		}
		return m;
	};
	const ax = bigrams(x);
	const bx = bigrams(y);
	let overlap = 0;
	for (const [g, count] of ax) overlap += Math.min(count, bx.get(g) ?? 0);
	const total = x.length - 1 + (y.length - 1);
	return (2 * overlap) / total;
}

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
