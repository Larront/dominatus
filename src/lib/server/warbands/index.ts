import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { warband } from '$lib/server/db/schema';
import type { WarbandInput } from '$lib/schemas/warband';

/** Warbands in a campaign, for selects and standings. */
export async function getWarbandsForCampaign(campaignId: string) {
	return db.query.warband.findMany({
		where: eq(warband.campaignId, campaignId),
		columns: { id: true, name: true, short: true, color: true, commanderUserId: true }
	});
}

/** The warbands a single commander fields in one campaign — their roster on the account page. */
export async function getWarbandsForCommander(campaignId: string, userId: string) {
	return db.query.warband.findMany({
		where: and(eq(warband.campaignId, campaignId), eq(warband.commanderUserId, userId)),
		columns: { id: true, name: true, short: true, color: true },
		orderBy: (w, { asc }) => [asc(w.createdAt)]
	});
}

/**
 * Muster a new warband for a commander in a campaign. The short tag is unique within a
 * campaign (case-insensitive) so the map and standings never show two identical tags;
 * returns a discriminated result rather than throwing so the action can surface the clash.
 */
export async function createWarband(
	input: WarbandInput & { campaignId: string; commanderUserId: string }
): Promise<{ ok: true; id: string } | { ok: false; reason: 'duplicate-short' }> {
	const existing = await db.query.warband.findMany({
		where: eq(warband.campaignId, input.campaignId),
		columns: { short: true }
	});
	if (existing.some((w) => w.short.toUpperCase() === input.short.toUpperCase())) {
		return { ok: false, reason: 'duplicate-short' };
	}

	const [row] = await db
		.insert(warband)
		.values({
			campaignId: input.campaignId,
			commanderUserId: input.commanderUserId,
			name: input.name,
			short: input.short,
			color: input.color
		})
		.returning({ id: warband.id });
	return { ok: true, id: row.id };
}
