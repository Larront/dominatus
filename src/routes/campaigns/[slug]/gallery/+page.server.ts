import { getGalleryAwards } from '$lib/server/standings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	// Members-only is enforced by the campaign layout (requireCampaignAccess); the whole campaign's
	// painted-models photos render here, filtered by warband client-side (issue #14).
	const { campaign } = await parent();
	const images = await getGalleryAwards(campaign.id);
	return { images, slug: campaign.slug };
};
