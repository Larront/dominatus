import { z } from 'zod';

/**
 * Validation for the battle-report form. Shared by the Superforms client and the
 * server action. A CV-derived draft pre-fills these fields; the commander confirms
 * before this schema gates the actual submission.
 */

export const battleSide = z.enum(['attacker', 'defender']);
export const battleOutcome = z.enum(['attacker', 'defender', 'stalemate']);

export const combatantSchema = z.object({
	warbandId: z.string().min(1, 'Select a warband'),
	side: battleSide,
	victoryPoints: z.number().int().min(0).optional()
});

export const battleReportSchema = z
	.object({
		worldId: z.string().min(1, 'Select a world'),
		cycle: z.number().int().positive(),
		outcome: battleOutcome,
		pointsSize: z.number().int().positive().optional(),
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
