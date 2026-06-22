import { sql, relations } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { user } from '../auth.schema';
import { campaign } from './campaign';
import type { ReportSnapshot } from '../../reports/snapshot';

/**
 * An append-only audit trail of arbiter corrections to the battle-report log (issue #6). One row per
 * arbiter **edit** or **delete** of a report, written in the same transaction that mutates the report
 * and re-folds control — so the log and its audit can never diverge. Records the action, the acting
 * user, the target report, an optional free-text reason, and a JSON snapshot of the report's prior
 * state (including combatants). Initial submission is *not* audited (it is already a "battle fought").
 *
 * Deliberately *not* surfaced by any UI in this slice — the chronicle reads it later.
 */
export const reportAudit = sqliteTable(
	'report_audit',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		campaignId: text('campaign_id')
			.notNull()
			.references(() => campaign.id, { onDelete: 'cascade' }),
		/**
		 * The target report's id. Plain text, *not* a foreign key: the audit row must outlive the
		 * report it records (a delete leaves only the audit behind).
		 */
		reportId: text('report_id').notNull(),
		action: text('action', { enum: ['edit', 'delete'] }).notNull(),
		/**
		 * The arbiter who made the correction. Like `battle_report.submitted_by_user_id`, a plain reference with
		 * no cascade so the trail is durable; account deletion reassigns it to the tombstone user.
		 */
		actorUserId: text('actor_user_id')
			.notNull()
			.references(() => user.id),
		/** Optional free-text reason. Prompted in the UI, never required (issue #6). */
		reason: text('reason'),
		/** The report's full prior state, including combatants, frozen before the mutation. */
		snapshot: text('snapshot', { mode: 'json' }).$type<ReportSnapshot>().notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
	},
	(t) => [
		index('report_audit_campaign_idx').on(t.campaignId),
		index('report_audit_report_idx').on(t.reportId)
	]
);

export const reportAuditRelations = relations(reportAudit, ({ one }) => ({
	campaign: one(campaign, { fields: [reportAudit.campaignId], references: [campaign.id] }),
	actor: one(user, { fields: [reportAudit.actorUserId], references: [user.id] })
}));

export type ReportAudit = typeof reportAudit.$inferSelect;
export type ReportAuditAction = ReportAudit['action'];
