/**
 * Sørensen–Dice character-bigram similarity, shared by the analysis matchers (warbands,
 * missions). Forgiving of OCR slips and spelling drift: it scores overlapping two-character
 * sequences rather than demanding exact text, returning a 0–1 confidence.
 */

export const normalize = (s: string) =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();

export function similarity(a: string, b: string): number {
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
