import { z } from 'zod';
import { scoringProfileSchema } from '$lib/domain/scoring-profile';
import { RENDER_KEYS, MIN_WORLDS, MAX_WORLDS } from '$lib/domain/archetypes';

/**
 * Validation for the campaign founding page (`/campaigns/new`). One nested form covering the whole
 * setup: identity, the generated system of worlds, the scoring profile, and the planetary-effect
 * pool. Submitted once; the server creates everything atomically. The slug and join code are
 * derived/generated server-side (links and codes stay the server's business), so they are not here.
 */

// Exported so the admin console can reuse the exact same world/effect shapes when editing them
// after founding (one definition, no drift).
export const foundingWorldSchema = z.object({
	name: z.string().trim().min(1, 'Name the world.').max(60, 'Keep the name under 60 characters.'),
	type: z
		.string()
		.trim()
		.min(1, 'Give the world a type.')
		.max(60, 'Keep the type under 60 characters.'),
	render: z.enum(RENDER_KEYS),
	value: z.string().trim().max(40, 'Keep it short.').default(''),
	garrison: z.string().trim().max(40, 'Keep it short.').default(''),
	supply: z.string().trim().max(40, 'Keep it short.').default(''),
	description: z.string().trim().max(400, 'Keep the description under 400 characters.').default('')
});

export const foundingEffectSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, 'Name the effect.')
		.max(60, 'Keep the title under 60 characters.'),
	description: z.string().trim().max(400, 'Keep the description under 400 characters.').default('')
});

/** Edit a charted world after founding (admin console): the founding world shape plus its id. */
export const worldEditSchema = foundingWorldSchema.extend({
	worldId: z.string().min(1, 'Missing world.')
});

export const foundingSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'Name the campaign.')
		.max(80, 'Keep the name under 80 characters.'),
	subtitle: z.string().trim().max(120, 'Keep the subtitle under 120 characters.').default(''),
	worlds: z
		.array(foundingWorldSchema)
		.min(MIN_WORLDS, 'A system needs at least one world.')
		.max(MAX_WORLDS, `Up to ${MAX_WORLDS} worlds for now.`),
	scoringProfile: scoringProfileSchema,
	effects: z.array(foundingEffectSchema).max(24, 'Up to 24 effects in the pool.').default([])
});

export type FoundingInput = z.infer<typeof foundingSchema>;
export type FoundingWorldInput = z.infer<typeof foundingWorldSchema>;
export type FoundingEffectInput = z.infer<typeof foundingEffectSchema>;
export type WorldEditInput = z.infer<typeof worldEditSchema>;
