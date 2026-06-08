import { sql, relations } from 'drizzle-orm';
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from '../auth.schema';
import { campaign } from './campaign';

/**
 * A user's place in a campaign and their role in it. Distinct from commanding a
 * warband: the role grants campaign authority, command is a property of the warband.
 */
export const membership = sqliteTable(
	'membership',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		campaignId: text('campaign_id')
			.notNull()
			.references(() => campaign.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: text('role', { enum: ['arbiter', 'commander'] })
			.notNull()
			.default('commander'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
	},
	(t) => [
		uniqueIndex('membership_campaign_user_idx').on(t.campaignId, t.userId),
		// exactly one arbiter per campaign
		uniqueIndex('membership_one_arbiter_idx')
			.on(t.campaignId)
			.where(sql`${t.role} = 'arbiter'`),
		index('membership_user_idx').on(t.userId)
	]
);

export const membershipRelations = relations(membership, ({ one }) => ({
	campaign: one(campaign, { fields: [membership.campaignId], references: [campaign.id] }),
	user: one(user, { fields: [membership.userId], references: [user.id] })
}));

export type Membership = typeof membership.$inferSelect;
export type CampaignRole = Membership['role'];
