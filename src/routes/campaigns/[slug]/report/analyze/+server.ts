import { json, error } from '@sveltejs/kit';
import { requireCampaignAccess } from '$lib/server/campaigns';
import { getWarbandIdentitiesForCampaign } from '$lib/server/warbands';
import { analyzeBattleReport } from '$lib/server/analysis/analyze-battle-report';
import { matchWarbands } from '$lib/server/analysis/match-warbands';
import type { RequestHandler } from './$types';

/** A scoresheet photo is at most a few MB; cap it so a stray upload can't tie up OCR. */
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

/**
 * Draft a battle report from an uploaded Tabletop Battles scoresheet (ADR 0001). The image is
 * OCR'd in memory and never stored — it only seeds the form, which the commander then confirms.
 * The draft can never be authoritative, so this returns suggestions, not a committed report.
 */
export const POST: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.user) throw error(401, 'Sign in to file a report');
	// Same gate as the form action: must be a member of this campaign.
	const { campaign } = await requireCampaignAccess(params.slug, locals.user.id);

	const data = await request.formData();
	const image = data.get('image');
	if (!(image instanceof File) || !image.type.startsWith('image/')) {
		throw error(400, 'Upload an image of the scoresheet');
	}
	if (image.size > MAX_IMAGE_BYTES) throw error(413, 'That image is too large');

	const draft = await analyzeBattleReport(image);

	// Resolve the OCR'd players to this campaign's warbands; blanks stay for the commander to pick.
	const warbands = await getWarbandIdentitiesForCampaign(campaign.id);
	const matched = matchWarbands(draft.combatants, warbands);
	draft.combatants.forEach((c, i) => {
		c.warbandId = matched[i];
	});

	return json(draft);
};
