import { z } from 'zod';

/**
 * Validation for the arbiter's campaign-details edit. Slug and id are immutable (links stay
 * stable), so only the display name, optional subtitle, and current cycle are editable here.
 */
export const campaignDetailsSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'A campaign needs a name.')
		.max(80, 'Keep the name under 80 characters'),
	subtitle: z.string().trim().max(120, 'Keep the subtitle under 120 characters').default(''),
	currentCycle: z.number().int('Cycle must be a whole number.').min(1, 'Cycle must be 1 or more.')
});

export type CampaignDetailsInput = z.infer<typeof campaignDetailsSchema>;
