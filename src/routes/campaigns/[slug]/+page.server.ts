import { getWorldsWithControl } from '$lib/server/worlds';
import { getWarbandsForCampaign } from '$lib/server/warbands';
import { getBattleLog } from '$lib/server/reports';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { campaign, user } = await parent();
	const [worlds, warbands, battleLog] = await Promise.all([
		getWorldsWithControl(campaign.id),
		getWarbandsForCampaign(campaign.id),
		getBattleLog(campaign.id)
	]);

	// Standings are derived, never stored: a warband's score is the count of
	// worlds it outright owns (holds a majority of). Sorted strongest-first.
	const standings = warbands
		.map((wb) => ({
			id: wb.id,
			name: wb.name,
			short: wb.short,
			color: wb.color,
			held: worlds.filter((w) => w.derived.owner === wb.id).length,
			you: user ? wb.commanderUserId === user.id : false
		}))
		.sort((a, b) => b.held - a.held || a.name.localeCompare(b.name));

	return { worlds, warbands, battleLog, standings };
};
