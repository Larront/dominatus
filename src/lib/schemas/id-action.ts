import { z } from 'zod';

/**
 * Validation for an id-only destructive action (reverse a report, revoke an award). The form
 * carries nothing but the record it targets; the server re-checks the id belongs to the campaign.
 */
export const idActionSchema = z.object({
	id: z.string().min(1, 'Missing record.')
});

export type IdActionInput = z.infer<typeof idActionSchema>;
