import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { battleReport } from '$lib/server/db/schema';

/** A battle report shaped for the world intel drawer's battle log. */
export interface BattleLogEntry {
	id: string;
	worldId: string;
	cycle: number;
	outcome: 'attacker' | 'defender' | 'stalemate';
	pointsSize: number | null;
	narrative: string | null;
	attackers: { warbandId: string; victoryPoints: number | null }[];
	defenders: { warbandId: string; victoryPoints: number | null }[];
}

/**
 * Every battle report in a campaign, newest cycle first, with combatants split
 * by side. Returned for the whole campaign and grouped by world on the client —
 * the dataset is small at hobby scale and the map shows one world at a time.
 */
export async function getBattleLog(campaignId: string): Promise<BattleLogEntry[]> {
	const rows = await db.query.battleReport.findMany({
		where: eq(battleReport.campaignId, campaignId),
		orderBy: (r, { desc }) => [desc(r.cycle), desc(r.createdAt)],
		with: { combatants: true }
	});

	return rows.map((r) => ({
		id: r.id,
		worldId: r.worldId,
		cycle: r.cycle,
		outcome: r.outcome,
		pointsSize: r.pointsSize,
		narrative: r.narrative,
		attackers: r.combatants
			.filter((c) => c.side === 'attacker')
			.map((c) => ({ warbandId: c.warbandId, victoryPoints: c.victoryPoints })),
		defenders: r.combatants
			.filter((c) => c.side === 'defender')
			.map((c) => ({ warbandId: c.warbandId, victoryPoints: c.victoryPoints }))
	}));
}
