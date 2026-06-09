import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { world } from '$lib/server/db/schema';
import { deriveControl } from '$lib/domain/control';
import type { WorldWithControl } from '$lib/domain/world';
import type { FoundingWorldInput } from '$lib/schemas/campaign-founding';

export type { WorldWithControl };

/** All worlds in a campaign, each with its control shares, derived state, and active effects. */
export async function getWorldsWithControl(campaignId: string): Promise<WorldWithControl[]> {
	const rows = await db.query.world.findMany({
		where: eq(world.campaignId, campaignId),
		// Stable order so the map's derived orbital positions never shuffle.
		orderBy: (w, { asc }) => [asc(w.createdAt), asc(w.id)],
		with: { control: true, effects: { with: { effect: true } } }
	});

	return rows.map((w) => {
		const shares = w.control.map((c) => ({ warbandId: c.warbandId, share: c.share }));
		return {
			id: w.id,
			name: w.name,
			type: w.type,
			value: w.value,
			garrison: w.garrison,
			supply: w.supply,
			description: w.description,
			render: w.render,
			shares,
			derived: deriveControl(shares),
			effects: w.effects.map((we) => ({
				id: we.effect.id,
				title: we.effect.title,
				description: we.effect.description
			}))
		};
	});
}

/**
 * Update a world's editable details, scoped to its campaign. Map position is still derived from id
 * + index (ADR/world schema), so it is untouched; the archetype `render` and `type` stay separate
 * editable columns (ADR 0005). Caller has asserted the arbiter role.
 */
export async function updateWorld(
	worldId: string,
	campaignId: string,
	fields: FoundingWorldInput
): Promise<void> {
	await db
		.update(world)
		.set({
			name: fields.name,
			type: fields.type,
			render: fields.render,
			value: fields.value || null,
			garrison: fields.garrison || null,
			supply: fields.supply || null,
			description: fields.description || null
		})
		.where(and(eq(world.id, worldId), eq(world.campaignId, campaignId)));
}
