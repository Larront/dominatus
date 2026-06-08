import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { warband } from '$lib/server/db/schema';

/** Warbands in a campaign, for selects and standings. */
export async function getWarbandsForCampaign(campaignId: string) {
	return db.query.warband.findMany({
		where: eq(warband.campaignId, campaignId),
		columns: { id: true, name: true, short: true, color: true, commanderUserId: true }
	});
}
