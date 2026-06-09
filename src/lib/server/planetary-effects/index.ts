import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { planetaryEffect, worldEffect, world } from '$lib/server/db/schema';

/** A pooled planetary effect, as shown in the admin pool and (when attached) the world drawer. */
export interface EffectRow {
	id: string;
	title: string;
	description: string | null;
}

/** The campaign's effect pool, in creation order. */
export async function getEffectPool(campaignId: string): Promise<EffectRow[]> {
	return db.query.planetaryEffect.findMany({
		where: eq(planetaryEffect.campaignId, campaignId),
		orderBy: (e, { asc }) => [asc(e.createdAt), asc(e.id)],
		columns: { id: true, title: true, description: true }
	});
}

export async function createEffect(
	campaignId: string,
	input: { title: string; description?: string | null }
): Promise<void> {
	await db.insert(planetaryEffect).values({
		campaignId,
		title: input.title,
		description: input.description?.trim() || null
	});
}

/** Update a pooled effect, scoped to its campaign so a stray id can't reach across campaigns. */
export async function updateEffect(
	id: string,
	campaignId: string,
	input: { title: string; description?: string | null }
): Promise<void> {
	await db
		.update(planetaryEffect)
		.set({ title: input.title, description: input.description?.trim() || null })
		.where(and(eq(planetaryEffect.id, id), eq(planetaryEffect.campaignId, campaignId)));
}

/** Delete a pooled effect (its world attachments cascade on the FK). Scoped to the campaign. */
export async function deleteEffect(id: string, campaignId: string): Promise<void> {
	await db
		.delete(planetaryEffect)
		.where(and(eq(planetaryEffect.id, id), eq(planetaryEffect.campaignId, campaignId)));
}

/** Map of worldId → attached effect ids, for the admin attachment UI. Campaign-scoped via the join. */
export async function getWorldEffectMap(campaignId: string): Promise<Record<string, string[]>> {
	const rows = await db
		.select({ worldId: worldEffect.worldId, effectId: worldEffect.effectId })
		.from(worldEffect)
		.innerJoin(world, eq(world.id, worldEffect.worldId))
		.where(eq(world.campaignId, campaignId));
	const map: Record<string, string[]> = {};
	for (const r of rows) (map[r.worldId] ??= []).push(r.effectId);
	return map;
}

/**
 * Attach a pooled effect to a world. Both must belong to the campaign (so an arbiter can't wire a
 * stray world/effect across campaigns); the unique (world, effect) index makes a repeat a no-op.
 */
export async function attachEffect(
	campaignId: string,
	worldId: string,
	effectId: string
): Promise<void> {
	const [w, e] = await Promise.all([
		db.query.world.findFirst({
			where: and(eq(world.id, worldId), eq(world.campaignId, campaignId)),
			columns: { id: true }
		}),
		db.query.planetaryEffect.findFirst({
			where: and(eq(planetaryEffect.id, effectId), eq(planetaryEffect.campaignId, campaignId)),
			columns: { id: true }
		})
	]);
	if (!w || !e) return;
	await db.insert(worldEffect).values({ worldId, effectId }).onConflictDoNothing();
}

/** Detach an effect from a world (current state only — no history). World must be in the campaign. */
export async function detachEffect(
	campaignId: string,
	worldId: string,
	effectId: string
): Promise<void> {
	const w = await db.query.world.findFirst({
		where: and(eq(world.id, worldId), eq(world.campaignId, campaignId)),
		columns: { id: true }
	});
	if (!w) return;
	await db
		.delete(worldEffect)
		.where(and(eq(worldEffect.worldId, worldId), eq(worldEffect.effectId, effectId)));
}
