import { getWorldsWithControl } from '$lib/server/worlds';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { campaign } = await parent();
	return { worlds: await getWorldsWithControl(campaign.id) };
};
