import { sql, relations } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { user } from '../auth.schema';
import { campaign } from './campaign';
import { worldControl } from './world-control';

/** A force contending for control of worlds. Commanded by exactly one user. */
export const warband = sqliteTable(
	'warband',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		campaignId: text('campaign_id')
			.notNull()
			.references(() => campaign.id, { onDelete: 'cascade' }),
		commanderUserId: text('commander_user_id')
			.notNull()
			.references(() => user.id),
		name: text('name').notNull(),
		/** Short tag shown on the map / standings, e.g. "IW". */
		short: text('short').notNull(),
		/** Display colour (hex). */
		color: text('color').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
	},
	(t) => [
		index('warband_campaign_idx').on(t.campaignId),
		index('warband_commander_idx').on(t.commanderUserId)
	]
);

export const warbandRelations = relations(warband, ({ one, many }) => ({
	campaign: one(campaign, { fields: [warband.campaignId], references: [campaign.id] }),
	commander: one(user, { fields: [warband.commanderUserId], references: [user.id] }),
	control: many(worldControl)
}));

export type Warband = typeof warband.$inferSelect;
