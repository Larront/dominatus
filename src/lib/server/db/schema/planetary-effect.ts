import { sql, relations } from 'drizzle-orm';
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { campaign } from './campaign';
import { world } from './world';

/**
 * A Planetary Effect (CONTEXT.md): a named, descriptive modifier the arbiter can declare in play
 * on a world — e.g. a warp storm. The app *displays* effects but never enforces them or folds them
 * into control or standings. Each campaign owns a pool of effects (authored at founding, editable
 * after); `worldEffect` records which of them currently sit on which world.
 */
export const planetaryEffect = sqliteTable(
	'planetary_effect',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		campaignId: text('campaign_id')
			.notNull()
			.references(() => campaign.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		description: text('description'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
	},
	(t) => [index('planetary_effect_campaign_idx').on(t.campaignId)]
);

/**
 * The current attachment of a pooled effect to a world. Mutable present state, not a cycle-stamped
 * history — the arbiter rotates effects over the campaign and the app remembers only what is on a
 * world right now.
 */
export const worldEffect = sqliteTable(
	'world_effect',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		worldId: text('world_id')
			.notNull()
			.references(() => world.id, { onDelete: 'cascade' }),
		effectId: text('effect_id')
			.notNull()
			.references(() => planetaryEffect.id, { onDelete: 'cascade' })
	},
	(t) => [uniqueIndex('world_effect_world_effect_idx').on(t.worldId, t.effectId)]
);

export const planetaryEffectRelations = relations(planetaryEffect, ({ one, many }) => ({
	campaign: one(campaign, { fields: [planetaryEffect.campaignId], references: [campaign.id] }),
	attachments: many(worldEffect)
}));

export const worldEffectRelations = relations(worldEffect, ({ one }) => ({
	world: one(world, { fields: [worldEffect.worldId], references: [world.id] }),
	effect: one(planetaryEffect, { fields: [worldEffect.effectId], references: [planetaryEffect.id] })
}));

export type PlanetaryEffect = typeof planetaryEffect.$inferSelect;
export type WorldEffect = typeof worldEffect.$inferSelect;
