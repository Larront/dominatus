import { sql, relations } from 'drizzle-orm';
import { sqliteTable, text, integer, index, check } from 'drizzle-orm/sqlite-core';
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
		/**
		 * The campaign's cycle at the moment the report was filed, stamped by the submit action. Not
		 * necessarily the cycle the battle was fought in: a report filed after a cycle turns over
		 * carries the new one (ADR 0006). `playedOn` is what records when the battle happened.
		 */
		cycle: integer('cycle').notNull(),
		/**
		 * The calendar day the battle was fought (CONTEXT: Played Date), as `YYYY-MM-DD`. This — not
		 * `createdAt` — is what the fold orders by (ADR 0006), so a game logged days late still applies
		 * where it happened.
		 *
		 * Text, not a timestamp, because a played date is a calendar day and not an instant: no anchor
		 * hour survives the date line (noon UTC on the 6th is already the 7th at UTC+13, where this
		 * campaign's players are). As text there is nothing to shift, and ISO dates sort chronologically
		 * so the ordering is a plain string sort. See $lib/domain/played-date.
		 */
		playedOn: text('played_on')
			.notNull()
			.default(sql`(strftime('%Y-%m-%d','now'))`),
		outcome: text('outcome', { enum: ['attacker', 'defender', 'stalemate'] }).notNull(),
		/** Which side took the first turn, if recorded. */
		wentFirst: text('went_first', { enum: ['attacker', 'defender'] }),
		/**
		 * The battle size fought at — either `combat-patrol` or a points size off the canonical ladder
		 * (see $lib/domain/battle-sizes). Null when not recorded.
		 *
		 * Text, not a number, because Combat Patrol is a distinct game rather than a points value, and
		 * because — like the missions — keeping the ladder in code means rotating it is data, not a
		 * schema migration. This column previously held a free integer; those values were migrated
		 * across as their digits, so an off-ladder legacy size survives and still renders.
		 */
		battleSize: text('battle_size'),
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
		/**
		 * When the report was *filed*. Never the day the battle was fought — that is `playedOn`. Still
		 * load-bearing: it breaks ties between two reports sharing a played date, so the fold stays a
		 * total order (ADR 0006).
		 */
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
	},
	(t) => [
		index('battle_report_world_idx').on(t.worldId),
		index('battle_report_campaign_idx').on(t.campaignId)
	]
);

/**
 * A participant on one side of a battle report. Sides need not be balanced — a report carries
 * one or two participants per side, so 1v1, 2v2 and the uneven 1v2 / 2v1 are all expressible.
 *
 * A participant is EITHER a campaign warband (`warbandId`) OR an outside opponent who isn't in
 * the league (`guestName`) — exactly one, enforced by the check constraint below and mirrored in
 * the zod schema. A guest is a name on the record only: they hold no world share and never reach
 * the leaderboard, because both the control fold and the standings fold drop non-warband
 * participants (see `foldCombatants` in $lib/domain/control-fold). The league warband opposite a
 * guest still scores and still gains or loses ground — against the uncontested pool, since the
 * guest has none to take.
 */
export const battleReportCombatant = sqliteTable(
	'battle_report_combatant',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		reportId: text('report_id')
			.notNull()
			.references(() => battleReport.id, { onDelete: 'cascade' }),
		/** The campaign warband that fought. Null for a guest — see `guestName`. */
		warbandId: text('warband_id').references(() => warband.id, { onDelete: 'cascade' }),
		/** An outside opponent's name, when this participant isn't in the league. Null for a warband. */
		guestName: text('guest_name'),
		side: text('side', { enum: ['attacker', 'defender'] }).notNull(),
		/**
		 * This side's primary mission, from the edition's canonical list (see $lib/domain/missions) —
		 * each side runs its own. Null when not recorded. Stored as free text, like secondaries, so an
		 * edition's mission set is data, not a schema change; the canonical constraint lives at the form
		 * and at analytics. In 2v2 only the side's lead combatant carries it (it shares the team score).
		 */
		primaryMission: text('primary_mission'),
		/**
		 * This side's force disposition, from the edition's canonical list (see $lib/domain/missions) —
		 * each side declares its own. Null when not recorded. Free text, like the missions, so the set
		 * is data not a schema change. Not on the scoresheet, so it is never OCR-derived.
		 */
		forceDisposition: text('force_disposition'),
		/** Primary-mission VP. Null when not recorded (e.g. unanalysed manual entry). */
		primaryVp: integer('primary_vp'),
		/** Battle-ready / paint VP. */
		battleReadyVp: integer('battle_ready_vp'),
		/** Per-secondary scores as a flexible list, so an edition's secondary set is data. */
		secondaries: text('secondaries', { mode: 'json' }).$type<
			{ name: string; victoryPoints: number }[]
		>()
	},
	(t) => [
		index('battle_report_combatant_report_idx').on(t.reportId),
		// Exactly one identity per participant: a league warband or a named guest, never both
		// or neither. The zod schema enforces the same rule at the form boundary; this is the
		// backstop so no code path can write a nameless, warbandless row.
		check(
			'battle_report_combatant_identity',
			sql`(${t.warbandId} is not null) <> (${t.guestName} is not null)`
		)
	]
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
