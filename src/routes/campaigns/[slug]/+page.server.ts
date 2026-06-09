import { getWorldsWithControl } from '$lib/server/worlds';
import { getWarbandsForCampaign } from '$lib/server/warbands';
import { getBattleLog } from '$lib/server/reports';
import { worldsHeld } from '$lib/domain/world';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { campaign, user } = await parent();
	const [worlds, warbands, battleLog] = await Promise.all([
		getWorldsWithControl(campaign.id),
		getWarbandsForCampaign(campaign.id),
		getBattleLog(campaign.id)
	]);

	// The map legend's spatial tally — worlds outright owned per warband (CONTEXT: Worlds Held).
	// Deliberately distinct from the points Standings at /standings (ADR 0003).
	const held = worldsHeld(worlds, warbands, user?.id);

	return { worlds, warbands, battleLog, worldsHeld: held };
};
