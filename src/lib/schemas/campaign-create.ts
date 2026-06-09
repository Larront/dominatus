import { z } from 'zod';

/**
 * Validation for founding a new campaign from the hub. The creator becomes its arbiter.
 * The slug is derived server-side from the name (links stay stable), so it is not entered here.
 */
export const foundCampaignSchema = z.object({
	name: z.string().trim().min(1, 'Name the campaign.').max(80, 'Keep the name under 80 characters.'),
	subtitle: z.string().trim().max(120, 'Keep the subtitle under 120 characters.').default('')
});

export type FoundCampaignInput = z.infer<typeof foundCampaignSchema>;

/**
 * Validation for joining an existing campaign by its join code — the short random code an arbiter
 * shares (distinct from the slug). Normalised to upper case; joining enlists you as a commander.
 */
export const joinCampaignSchema = z.object({
	code: z
		.string()
		.trim()
		.toUpperCase()
		.min(1, 'Enter the campaign code.')
		.max(5, 'A code is 5 characters.')
		.regex(/^[A-Z0-9]+$/, 'Codes are letters and digits.')
});

export type JoinCampaignInput = z.infer<typeof joinCampaignSchema>;
