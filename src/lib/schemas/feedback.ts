import { z } from 'zod';

/**
 * Validation for an issue or suggestion reported from anywhere in the app. The reporter's name
 * and email come from the session — never the form — so all the commander supplies is the kind
 * of report and the message itself.
 */
export const feedbackSchema = z.object({
	type: z.enum(['bug', 'suggestion']).default('bug'),
	message: z
		.string()
		.trim()
		.min(10, 'Tell us a little more — at least 10 characters.')
		.max(4000, 'Keep it under 4000 characters.')
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
