import { sql, relations } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { user } from '../auth.schema';
import { campaign } from './campaign';
import { world } from './world';
import { warband } from './warband';

/**
 * The record a commander submits documenting a game fought over a world.
 * Always human-confirmed; an uploaded image only seeds a draft (see ADR 0001).
 */
export const battleReport = sqliteTable(
	'battle_report',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		campaignId: text('campaign_id')
			.notNull()
			.references(() => campaign.id, { onDelete: 'cascade' }),
		worldId: text('world_id')
			.notNull()
			.references(() => world.id, { onDelete: 'cascade' }),
		/** The cycle the battle was fought in. */
		cycle: integer('cycle').notNull(),
		outcome: text('outcome', { enum: ['attacker', 'defender', 'stalemate'] }).notNull(),
		/** Which side took the first turn, if recorded. */
		wentFirst: text('went_first', { enum: ['attacker', 'defender'] }),
		/** Agreed points size of the game, e.g. 2000. */
		pointsSize: integer('points_size'),
		/** The weekly planetary effect in play, if the players used one. Display-only. */
		planetaryEffect: text('planetary_effect'),
		narrative: text('narrative'),
		/**
		 * Stored scoresheet filename (a UUID + extension) under the data volume's images dir, if
		 * one was uploaded. Written on submit as evidence for the confirmed report (ADR 0001);
		 * served via /campaigns/[slug]/report/image/[file]. See src/lib/server/report-images.ts.
		 */
		imagePath: text('image_path'),
		submittedByUserId: text('submitted_by_user_id')
			.notNull()
			.references(() => user.id),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
	},
	(t) => [
		index('battle_report_world_idx').on(t.worldId),
		index('battle_report_campaign_idx').on(t.campaignId)
	]
);

/** A warband on one side of a battle report (1v1 → 2 rows, 2v2 → 4 rows). */
export const battleReportCombatant = sqliteTable(
	'battle_report_combatant',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		reportId: text('report_id')
			.notNull()
			.references(() => battleReport.id, { onDelete: 'cascade' }),
		warbandId: text('warband_id')
			.notNull()
			.references(() => warband.id, { onDelete: 'cascade' }),
		side: text('side', { enum: ['attacker', 'defender'] }).notNull(),
		/** Primary-mission VP. Null when not recorded (e.g. unanalysed manual entry). */
		primaryVp: integer('primary_vp'),
		/** Battle-ready / paint VP. */
		battleReadyVp: integer('battle_ready_vp'),
		/** Per-secondary scores as a flexible list, so an edition's secondary set is data. */
		secondaries: text('secondaries', { mode: 'json' }).$type<
			{ name: string; victoryPoints: number }[]
		>()
	},
	(t) => [index('battle_report_combatant_report_idx').on(t.reportId)]
);

export const battleReportRelations = relations(battleReport, ({ one, many }) => ({
	campaign: one(campaign, { fields: [battleReport.campaignId], references: [campaign.id] }),
	world: one(world, { fields: [battleReport.worldId], references: [world.id] }),
	submittedBy: one(user, { fields: [battleReport.submittedByUserId], references: [user.id] }),
	combatants: many(battleReportCombatant)
}));

export const battleReportCombatantRelations = relations(battleReportCombatant, ({ one }) => ({
	report: one(battleReport, {
		fields: [battleReportCombatant.reportId],
		references: [battleReport.id]
	}),
	warband: one(warband, { fields: [battleReportCombatant.warbandId], references: [warband.id] })
}));

export type BattleReport = typeof battleReport.$inferSelect;
export type BattleReportCombatant = typeof battleReportCombatant.$inferSelect;
export type BattleSide = BattleReportCombatant['side'];
