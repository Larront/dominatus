import { relations } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { world } from './world';
import { warband } from './warband';

/**
 * The source of truth for control: the share a warband holds of a world.
 * Owner / contested / unclaimed are derived from these rows, never stored.
 */
export const worldControl = sqliteTable(
	'world_control',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		worldId: text('world_id')
			.notNull()
			.references(() => world.id, { onDelete: 'cascade' }),
		warbandId: text('warband_id')
			.notNull()
			.references(() => warband.id, { onDelete: 'cascade' }),
		/** Percentage share, 0–100. */
		share: integer('share').notNull().default(0)
	},
	(t) => [uniqueIndex('world_control_world_warband_idx').on(t.worldId, t.warbandId)]
);

export const worldControlRelations = relations(worldControl, ({ one }) => ({
	world: one(world, { fields: [worldControl.worldId], references: [world.id] }),
	warband: one(warband, { fields: [worldControl.warbandId], references: [warband.id] })
}));

export type WorldControl = typeof worldControl.$inferSelect;
