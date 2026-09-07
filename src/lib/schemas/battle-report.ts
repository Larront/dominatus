import { z } from 'zod';
import { FORCE_DISPOSITIONS, isPrimaryMissionFor } from '$lib/domain/missions';
import { isBattleSize, usesSecondaries, MAX_BATTLE_SIZE } from '$lib/domain/battle-sizes';

/**
 * Validation for the battle-report form. Shared by the Superforms client and the
 * server action. A CV-derived draft pre-fills these fields; the commander confirms
 * before this schema gates the actual submission.
 */

export const battleSide = z.enum(['attacker', 'defender']);
export const battleOutcome = z.enum(['attacker', 'defender', 'stalemate']);

/**
 * Upper bound on secondaries per combatant — a safety ceiling above a real scoresheet's row
 * count, not a game rule. A Tabletop Battles sheet lists every mission in play (≈11), so the
 * old limit of six silently dropped real scoring rows. Shared by the schema, the OCR draft,
 * and the form so the three never disagree on the cap.
 */
export const MAX_SECONDARIES = 20;

/**
 * One secondary mission's score, recorded separately so the full game sheet is
 * captured. Stored as a flexible list (not fixed columns) so a future edition's
 * different secondary set is data, never a schema change.
 */
export const secondaryScoreSchema = z.object({
	name: z.string().min(1, 'Name the secondary').max(80),
	victoryPoints: z.number().int().min(0)
});

/** Max characters for an outside opponent's name — a label on the record, not a warband. */
export const MAX_GUEST_NAME = 60;

export const combatantSchema = z.object({
	/**
	 * The campaign warband that fought, or '' when this slot is a guest. Exactly one of this and
	 * `guestName` is set — checked per combatant by the refine below rather than here, so the
	 * error lands on the field the commander needs to fix.
	 */
	warbandId: z.string().default(''),
	/**
	 * An outside opponent who isn't in the league. Recorded by name so the game can be logged and
	 * the league warband still scores; the guest holds no ground and never reaches the leaderboard.
	 */
	guestName: z.string().max(MAX_GUEST_NAME).nullish(),
	side: battleSide,
	/**
	 * This side's primary mission (each side runs its own). Optional — a report without one submits
	 * fine — but when set it must be canonical for the report's *battle size*, since a Combat Patrol
	 * game draws from a different pack than a matched-play one. That makes it a cross-field rule, so
	 * it is checked in the parent's `superRefine` (where `battleSize` is visible) rather than here.
	 * Empty string means "none chosen". Secondaries stay free text by contrast, constrained only at
	 * the picker so existing / rotated names survive.
	 */
	primaryMission: z.string().optional(),
	/**
	 * This side's force disposition (each side declares its own). Optional, and constrained to the
	 * canonical list when set — same pattern as `primaryMission`. Not on the scoresheet, so it is a
	 * manual picker only, never seeded from a draft.
	 */
	forceDisposition: z
		.string()
		.refine(
			(d) => d === '' || (FORCE_DISPOSITIONS as readonly string[]).includes(d),
			'Choose a force disposition from the list'
		)
		.optional(),
	// Full score breakdown — all optional so manual entry never blocks while the CV
	// draft (ADR 0001), which populates these, is stubbed. Control uses `outcome`,
	// not these values; they are the durable record. Total VP is derived for display.
	// `nullish` because an empty number input binds to null, not undefined.
	primaryVp: z.number().int().min(0).nullish(),
	secondaries: z.array(secondaryScoreSchema).max(MAX_SECONDARIES).default([]),
	battleReadyVp: z.number().int().min(0).nullish()
});

export const battleReportSchema = z
	.object({
		worldId: z.string().min(1, 'Select a world'),
		cycle: z.number().int().positive(),
		outcome: battleOutcome,
		/** Which side took the first turn — at most one. */
		wentFirst: battleSide.nullish(),
		/**
		 * The battle size fought at — a Combat Patrol game, or a points size off the canonical ladder
		 * (see $lib/domain/battle-sizes). Optional; empty string means "not recorded". Stored as free
		 * text so the ladder is data rather than a schema migration.
		 *
		 * A bare number is accepted alongside the ladder because this field used to be a free points
		 * input: an amended legacy report carrying an off-ladder size (say 1250) must survive a
		 * re-submit rather than be rejected by a list it predates. New entries only ever come from the
		 * picker, so in practice the ladder is the constraint.
		 */
		battleSize: z
			.string()
			.max(MAX_BATTLE_SIZE)
			.refine(
				(v) => v === '' || isBattleSize(v) || /^\d+$/.test(v),
				'Choose a battle size from the list'
			)
			.nullish(),
		/** The weekly planetary effect in play, if the players used one. Display-only. */
		planetaryEffect: z.string().max(120).optional(),
		narrative: z.string().max(4000).optional(),
		combatants: z.array(combatantSchema).min(2).max(4)
	})
	.superRefine((r, ctx) => {
		// A Combat Patrol game scores no secondaries — its pack has none — so the block is hidden on
		// the form and rejected here, rather than silently stored and then summed into a total VP that
		// no scoresheet would agree with.
		const secondariesAllowed = usesSecondaries(r.battleSize);

		// Per-combatant rules. Each is reported against its own slot so the message lands on the
		// field the commander has to fix, rather than on the form as a whole.

		r.combatants.forEach((c, i) => {
			// The canonical primary-mission pack depends on the battle size, so this lands here rather
			// than on the field. Reported per slot so the error sits on the picker that is wrong.
			const primary = c.primaryMission;
			if (primary && !isPrimaryMissionFor(primary, r.battleSize)) {
				ctx.addIssue({
					code: 'custom',
					path: ['combatants', i, 'primaryMission'],
					message: 'Choose a primary mission from the list'
				});
			}

			if (!secondariesAllowed && c.secondaries.length) {
				ctx.addIssue({
					code: 'custom',
					path: ['combatants', i, 'secondaries'],
					message: 'A Combat Patrol game scores no secondary missions'
				});
			}

			// A participant is EITHER a league warband or a named guest, never both or neither.
			const guest = c.guestName?.trim();
			if (!c.warbandId && !guest) {
				ctx.addIssue({
					code: 'custom',
					path: ['combatants', i, 'warbandId'],
					message: 'Select a warband, or name an outside opponent'
				});
			} else if (c.warbandId && guest) {
				ctx.addIssue({
					code: 'custom',
					path: ['combatants', i, 'guestName'],
					message: 'A slot is either a warband or a guest, not both'
				});
			}
		});
	})
	.refine(
		(r) => {
			const attackers = r.combatants.filter((c) => c.side === 'attacker').length;
			const defenders = r.combatants.filter((c) => c.side === 'defender').length;
			// One or two per side, and sides need NOT match: 1v1, 2v2 and the uneven 1v2 / 2v1
			// are all real games. Control moves per combatant, so an uneven result is well-defined.
			return attackers >= 1 && attackers <= 2 && defenders >= 1 && defenders <= 2;
		},
		{ message: 'Each side needs one or two combatants', path: ['combatants'] }
	)
	.refine(
		(r) => {
			// Guests are excluded — two different outsiders may share a name, and an empty
			// warbandId marks a guest slot rather than a duplicate.
			const ids = r.combatants.map((c) => c.warbandId).filter(Boolean);
			return new Set(ids).size === ids.length;
		},
		{ message: 'A warband cannot appear twice', path: ['combatants'] }
	)
	.refine((r) => r.combatants.some((c) => c.warbandId), {
		// A report is a league record: at least one side must be a campaign warband, or there is
		// nothing to score and no control to move.
		message: 'At least one combatant must be a warband in this campaign',
		path: ['combatants']
	});

export type BattleReportInput = z.infer<typeof battleReportSchema>;
export type CombatantInput = z.infer<typeof combatantSchema>;
export type SecondaryScore = z.infer<typeof secondaryScoreSchema>;
