import { json, error } from '@sveltejs/kit';
import { requireCampaignAccess } from '$lib/server/campaigns';
import { getWarbandIdentitiesForCampaign } from '$lib/server/warbands';
import { analyzeBattleReport } from '$lib/server/analysis/analyze-battle-report';
import { matchWarbands } from '$lib/server/analysis/match-warbands';
import { checkImageUpload } from '$lib/server/report-images';
import type { RequestHandler } from './$types';

/**
 * Draft a battle report from an uploaded Tabletop Battles scoresheet (ADR 0001). The image is
 * OCR'd in memory here and not stored at this step — it only seeds the form. The scoresheet is
 * persisted later, on submit, as evidence for the confirmed report (see `report-images.ts`). The
 * draft can never be authoritative, so this returns suggestions, not a committed report.
 */
export const POST: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.user) throw error(401, 'Sign in to file a report');
	// Same gate as the form action: must be a member of this campaign.
	const { campaign } = await requireCampaignAccess(params.slug, locals.user.id);

	const data = await request.formData();
	const check = checkImageUpload(data.get('image'));
	if (check.kind === 'none') throw error(400, 'Upload an image of the scoresheet');
	if (check.kind === 'error') throw error(check.status, check.message);

	const draft = await analyzeBattleReport(check.file);

	// Resolve the OCR'd players to this campaign's warbands; blanks stay for the commander to pick.
	const warbands = await getWarbandIdentitiesForCampaign(campaign.id);
	const matched = matchWarbands(draft.combatants, warbands);
	draft.combatants.forEach((c, i) => {
		c.warbandId = matched[i];
	});

	return json(draft);
};
