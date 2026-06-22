import { getChronicle } from '$lib/server/chronicle';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	// Members-only is enforced by the campaign layout (requireCampaignAccess); arbiters and
	// commanders both read the same feed.
	const { campaign } = await parent();
	const events = await getChronicle(campaign.id, campaign.currentCycle);
	// `slug` lets a painting-award event's thumbnail link into the gallery, filtered to its warband.
	return { events, slug: campaign.slug };
};
