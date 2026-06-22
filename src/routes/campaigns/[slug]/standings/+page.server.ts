import {
	getStandings,
	getStatReports,
	getStatWarbands,
	getMissionAnalytics,
	getGalleryAwards
} from '$lib/server/standings';
import { DEFAULT_PROFILE } from '$lib/domain/scoring-profile';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { campaign, role, user } = await parent();
	const isArbiter = role === 'arbiter';
	// Score by the campaign's profile; legacy campaigns with no profile fall back to the default.
	const profile = campaign.scoringProfile ?? DEFAULT_PROFILE;

	const [standings, statReports, statWarbands, missionAnalytics, galleryImages] = await Promise.all(
		[
			getStandings(campaign.id, profile, user?.id),
			// The whole campaign log + every warband, so any warband's block and any head-to-head
			// rivalry can be computed client-side (issue #12).
			getStatReports(campaign.id),
			getStatWarbands(campaign.id),
			// Campaign-wide mission win rates / average scores, computed server-side (static, no filters).
			getMissionAnalytics(campaign.id),
			// Every award photo, so the stat block can show the selected warband's painted models (issue #14).
			getGalleryAwards(campaign.id)
		]
	);

	return {
		standings,
		statReports,
		statWarbands,
		missionAnalytics,
		galleryImages,
		// The id of the viewer's commander, so the stats default to their own warbands when present.
		viewerUserId: user?.id ?? null,
		isArbiter,
		profile,
		slug: campaign.slug
	};
};
