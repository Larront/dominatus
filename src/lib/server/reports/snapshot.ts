import type { BattleReport, BattleReportCombatant } from '$lib/server/db/schema/battle-report';

/**
 * The prior state of a battle report, frozen for the audit trail (issue #6). Captures the report's
 * own fields plus every combatant so a reverted edit or delete has a complete, self-contained record
 * of what the report looked like before the arbiter touched it. Stored as JSON on `report_audit`.
 *
 * `createdAt` is the report's original submit time as epoch milliseconds (not a `Date`) so the
 * snapshot round-trips losslessly through JSON. `playedOn` needs no such treatment — a played date
 * is already a `YYYY-MM-DD` string (CONTEXT: Played Date). It is frozen here because an amend may
 * *change* it, and changing it re-orders the fold, so the prior date is part of what a revert
 * would have to restore.
 */
export interface ReportSnapshot {
	report: {
		id: string;
		campaignId: string;
		worldId: string;
		cycle: number;
		playedOn: string;
		outcome: 'attacker' | 'defender' | 'stalemate';
		wentFirst: 'attacker' | 'defender' | null;
		battleSize: string | null;
		planetaryEffect: string | null;
		narrative: string | null;
		imagePath: string | null;
		submittedByUserId: string;
		createdAt: number;
	};
	combatants: {
		/** The campaign warband, or null for an outside opponent — then `guestName` carries them. */
		warbandId: string | null;
		/** An outside opponent's name; null for a campaign warband. Frozen so a reverted edit
		 * restores who actually played, not just the league side of the game. */
		guestName: string | null;
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
			playedOn: report.playedOn,
			outcome: report.outcome,
			wentFirst: report.wentFirst,
			battleSize: report.battleSize,
			planetaryEffect: report.planetaryEffect,
			narrative: report.narrative,
			imagePath: report.imagePath,
			submittedByUserId: report.submittedByUserId,
			createdAt: report.createdAt.getTime()
		},
		combatants: combatants.map((c) => ({
			warbandId: c.warbandId,
			guestName: c.guestName,
			side: c.side,
			primaryMission: c.primaryMission,
			forceDisposition: c.forceDisposition,
			primaryVp: c.primaryVp,
			battleReadyVp: c.battleReadyVp,
			secondaries: c.secondaries ?? []
		}))
	};
}
