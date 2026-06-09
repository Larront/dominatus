import { sql, relations } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { user } from '../auth.schema';
import { campaign } from './campaign';
import { warband } from './warband';

/**
 * A discrete point grant the arbiter makes by hand, for things no battle report captures
 * (currently painting). The award logs only its **kind**; its point value is read from the
 * campaign's scoring profile at compute time (ADR 0004 — no snapshot), so editing the profile
 * re-scores past awards alongside the derived points.
 */
export const paintingAward = sqliteTable(
	'painting_award',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		campaignId: text('campaign_id')
			.notNull()
			.references(() => campaign.id, { onDelete: 'cascade' }),
		warbandId: text('warband_id')
			.notNull()
			.references(() => warband.id, { onDelete: 'cascade' }),
		/** The cycle the award was granted in. */
		cycle: integer('cycle').notNull(),
		/** What was painted; the profile maps the kind to its point value. */
		kind: text('kind', { enum: ['unit', 'character', 'terrain'] }).notNull(),
		/** Optional free-text note, e.g. "Hierophant Bio-Titan". */
		note: text('note'),
		grantedByUserId: text('granted_by_user_id')
			.notNull()
			.references(() => user.id),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
	},
	(t) => [
		index('painting_award_campaign_idx').on(t.campaignId),
		index('painting_award_warband_idx').on(t.warbandId)
	]
);

export const paintingAwardRelations = relations(paintingAward, ({ one }) => ({
	campaign: one(campaign, { fields: [paintingAward.campaignId], references: [campaign.id] }),
	warband: one(warband, { fields: [paintingAward.warbandId], references: [warband.id] }),
	grantedBy: one(user, { fields: [paintingAward.grantedByUserId], references: [user.id] })
}));

export type PaintingAward = typeof paintingAward.$inferSelect;
export type PaintingKind = PaintingAward['kind'];
