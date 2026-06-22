import { z } from 'zod';
import { PRIMARY_MISSIONS, FORCE_DISPOSITIONS } from '$lib/domain/missions';

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

export const combatantSchema = z.object({
	warbandId: z.string().min(1, 'Select a warband'),
	side: battleSide,
	/**
	 * This side's primary mission (each side runs its own). Optional — a report without one submits
	 * fine — but when set it must be one of the edition's canonical primary missions (the constraint
	 * lives here and at the picker). Empty string means "none chosen". A plain `.includes` (not the
	 * `isPrimaryMission` guard) keeps the field a plain string rather than narrowing it to the literal
	 * union. Secondaries stay free text by contrast, constrained only at the picker so existing /
	 * rotated names survive.
	 */
	primaryMission: z
		.string()
		.refine(
			(m) => m === '' || (PRIMARY_MISSIONS as readonly string[]).includes(m),
			'Choose a primary mission from the list'
		)
		.optional(),
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
		pointsSize: z.number().int().positive().nullish(),
		/** The weekly planetary effect in play, if the players used one. Display-only. */
		planetaryEffect: z.string().max(120).optional(),
		narrative: z.string().max(4000).optional(),
		combatants: z.array(combatantSchema).min(2).max(4)
	})
	.refine(
		(r) => {
			const attackers = r.combatants.filter((c) => c.side === 'attacker').length;
			const defenders = r.combatants.filter((c) => c.side === 'defender').length;
			// games are 1v1 or 2v2: balanced sides of one or two warbands each
			return attackers === defenders && attackers >= 1 && attackers <= 2;
		},
		{ message: 'Sides must be balanced — 1v1 or 2v2', path: ['combatants'] }
	)
	.refine((r) => new Set(r.combatants.map((c) => c.warbandId)).size === r.combatants.length, {
		message: 'A warband cannot appear twice',
		path: ['combatants']
	});

export type BattleReportInput = z.infer<typeof battleReportSchema>;
export type CombatantInput = z.infer<typeof combatantSchema>;
export type SecondaryScore = z.infer<typeof secondaryScoreSchema>;
