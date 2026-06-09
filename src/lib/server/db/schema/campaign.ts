import { sql, relations } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { membership } from './membership';
import { warband } from './warband';
import { world } from './world';
import { battleReport } from './battle-report';
import { planetaryEffect } from './planetary-effect';
import type { ScoringProfile } from '$lib/domain/scoring-profile';

/** A bounded narrative war. Multiple campaigns can run concurrently. */
export const campaign = sqliteTable('campaign', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	slug: text('slug').notNull().unique(),
	/**
	 * The short code a commander enters to enlist — distinct from the slug (ADR/CONTEXT: Join Code).
	 * Nullable so pre-existing campaigns migrate cleanly; new campaigns always carry one. Unique.
	 */
	joinCode: text('join_code').unique(),
	name: text('name').notNull(),
	subtitle: text('subtitle'),
	/**
	 * Per-campaign scoring profile (ADR 0004), stored as JSON. Null on legacy rows; readers fall
	 * back to DEFAULT_PROFILE so a missing profile scores like the pre-profile app.
	 */
	scoringProfile: text('scoring_profile', { mode: 'json' }).$type<ScoringProfile>(),
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
	battleReports: many(battleReport),
	effects: many(planetaryEffect)
}));

export type Campaign = typeof campaign.$inferSelect;
