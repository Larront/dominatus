import { json, error } from '@sveltejs/kit';
import { requireCampaignAccess } from '$lib/server/campaigns';
import { getWarbandIdentitiesForCampaign } from '$lib/server/warbands';
import { analyzeBattleReport } from '$lib/server/analysis/analyze-battle-report';
import { matchWarbands } from '$lib/server/analysis/match-warbands';
import { matchMission, matchSecondaries } from '$lib/server/analysis/match-missions';
import { PRIMARY_MISSIONS, SECONDARY_MISSIONS } from '$lib/domain/missions';
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

	// Constrain the OCR'd mission labels to the edition's canonical set; an uncertain read is left
	// blank for the commander to choose rather than guessed. Each side runs its own primary, so match
	// per combatant.
	for (const c of draft.combatants) {
		c.primaryMission = matchMission(c.detectedPrimaryMission, PRIMARY_MISSIONS);
		const names = matchSecondaries(
			c.secondaries.map((s) => s.name),
			SECONDARY_MISSIONS
		);
		c.secondaries = c.secondaries.map((s, i) => ({ ...s, name: names[i] ?? '' }));
	}

	return json(draft);
};
