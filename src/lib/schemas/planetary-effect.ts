import { z } from 'zod';
import { foundingEffectSchema } from './campaign-founding';

/**
 * Validation for the arbiter's planetary-effect pool edits (the admin console). Created and edited
 * effects reuse the exact founding effect shape (one definition, no drift); editing and attaching
 * add the record ids the server re-checks against the campaign.
 */

/** Create one pool effect — the same title/description shape as founding. */
export const effectSchema = foundingEffectSchema;

/** Edit a pool effect: its fields plus the id it targets. */
export const effectEditSchema = foundingEffectSchema.extend({
	id: z.string().min(1, 'Missing record.')
});

/** Attach or detach an effect to/from a world — both ids, re-checked server-side. */
export const worldEffectSchema = z.object({
	worldId: z.string().min(1, 'Missing world.'),
	effectId: z.string().min(1, 'Missing effect.')
});

export type EffectInput = z.infer<typeof effectSchema>;
export type EffectEditInput = z.infer<typeof effectEditSchema>;
export type WorldEffectInput = z.infer<typeof worldEffectSchema>;
