import { z } from 'zod';

/**
 * Validation for the arbiter's painting award. The point value isn't a field — it's
 * snapshotted from `kind` at grant time (ADR 0003) — so the form only carries the
 * warband, what was painted, and an optional note.
 */
export const paintingAwardSchema = z.object({
	warbandId: z.string().min(1, 'Choose a warband.'),
	kind: z.enum(['unit', 'character', 'terrain']),
	note: z.string().trim().max(200, 'Keep the note under 200 characters').default('')
});

export type PaintingAwardInput = z.infer<typeof paintingAwardSchema>;
