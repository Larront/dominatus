import { z } from 'zod';

/**
 * Validation for mustering a warband. Shared by the account-page action and any
 * client-side guard. A warband is a force a commander contends with (CONTEXT.md) —
 * just a name, a short map/standings tag, and a display colour at creation.
 */
export const warbandSchema = z.object({
	name: z.string().trim().min(1, 'Name your warband').max(60, 'Keep the name under 60 characters'),
	/** Short tag shown on the map and standings, e.g. "IW". Folded to uppercase. */
	short: z
		.string()
		.trim()
		.toUpperCase()
		.min(1, 'Give it a tag')
		.max(4, 'Tag is at most 4 characters')
		.regex(/^[A-Z0-9]+$/, 'Tag is letters and digits only'),
	/** Display colour as a hex triplet, e.g. "#5f93c4". The native colour input emits this form. */
	color: z
		.string()
		.trim()
		.toLowerCase()
		.regex(/^#[0-9a-f]{6}$/, 'Pick a colour')
});

export type WarbandInput = z.infer<typeof warbandSchema>;
