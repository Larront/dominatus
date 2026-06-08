import { sql, relations } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { campaign } from './campaign';
import { worldControl } from './world-control';
import { battleReport } from './battle-report';

/**
 * A celestial body fought over within a campaign. Map positioning is intentionally
 * absent — it will be defined when the new system-view layout is designed.
 */
export const world = sqliteTable(
	'world',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		campaignId: text('campaign_id')
			.notNull()
			.references(() => campaign.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		/** Classification, e.g. "Forge World", "Cardinal Hive World". */
		type: text('type').notNull(),
		/** Strategic value, e.g. "Critical", "Decisive", "Moderate". */
		value: text('value'),
		garrison: text('garrison'),
		supply: text('supply'),
		/** PixelPlanets render recipe, e.g. "lava", "ocean", "hive". */
		render: text('render').notNull().default('rocky'),
		description: text('description'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
	},
	(t) => [index('world_campaign_idx').on(t.campaignId)]
);

export const worldRelations = relations(world, ({ one, many }) => ({
	campaign: one(campaign, { fields: [world.campaignId], references: [campaign.id] }),
	control: many(worldControl),
	battleReports: many(battleReport)
}));

export type World = typeof world.$inferSelect;
