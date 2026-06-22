import type { BattleReport, BattleReportCombatant } from '$lib/server/db/schema/battle-report';

/**
 * The prior state of a battle report, frozen for the audit trail (issue #6). Captures the report's
 * own fields plus every combatant so a reverted edit or delete has a complete, self-contained record
 * of what the report looked like before the arbiter touched it. Stored as JSON on `report_audit`.
 *
 * `createdAt` is the report's original submit time as epoch milliseconds (not a `Date`) so the
 * snapshot round-trips losslessly through JSON.
 */
export interface ReportSnapshot {
	report: {
		id: string;
		campaignId: string;
		worldId: string;
		cycle: number;
		outcome: 'attacker' | 'defender' | 'stalemate';
		wentFirst: 'attacker' | 'defender' | null;
		pointsSize: number | null;
		planetaryEffect: string | null;
		narrative: string | null;
		imagePath: string | null;
		submittedByUserId: string;
		createdAt: number;
	};
	combatants: {
		warbandId: string;
		side: 'attacker' | 'defender';
		primaryMission: string | null;
		forceDisposition: string | null;
		primaryVp: number | null;
		battleReadyVp: number | null;
		secondaries: { name: string; victoryPoints: number }[];
	}[];
}

/**
 * Shape a report row and its combatants into the audit snapshot. Pure — no DB access — so it is
 * unit-testable and so the audit insert and the report mutation can share one read inside the
 * transaction. The `Date` `createdAt` is flattened to epoch ms for JSON storage.
 */
export function buildReportSnapshot(
	report: BattleReport,
	combatants: BattleReportCombatant[]
): ReportSnapshot {
	return {
		report: {
			id: report.id,
			campaignId: report.campaignId,
			worldId: report.worldId,
			cycle: report.cycle,
			outcome: report.outcome,
			wentFirst: report.wentFirst,
			pointsSize: report.pointsSize,
			planetaryEffect: report.planetaryEffect,
			narrative: report.narrative,
			imagePath: report.imagePath,
			submittedByUserId: report.submittedByUserId,
			createdAt: report.createdAt.getTime()
		},
		combatants: combatants.map((c) => ({
			warbandId: c.warbandId,
			side: c.side,
			primaryMission: c.primaryMission,
			forceDisposition: c.forceDisposition,
			primaryVp: c.primaryVp,
			battleReadyVp: c.battleReadyVp,
			secondaries: c.secondaries ?? []
		}))
	};
}
