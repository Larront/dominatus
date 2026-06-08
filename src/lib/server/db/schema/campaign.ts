import { sql, relations } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { membership } from './membership';
import { warband } from './warband';
import { world } from './world';
import { battleReport } from './battle-report';

/** A bounded narrative war. Multiple campaigns can run concurrently. */
export const campaign = sqliteTable('campaign', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	subtitle: text('subtitle'),
	/** The campaign's current phase. Resolution rules are deferred. */
	currentCycle: integer('current_cycle').notNull().default(1),
	status: text('status', { enum: ['active', 'archived'] })
		.notNull()
		.default('active'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
});

export const campaignRelations = relations(campaign, ({ many }) => ({
	memberships: many(membership),
	warbands: many(warband),
	worlds: many(world),
	battleReports: many(battleReport)
}));

export type Campaign = typeof campaign.$inferSelect;
