import { fail } from '@sveltejs/kit';
import { superValidate, message, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { paintingAwardSchema } from '$lib/schemas/painting-award';
import { idActionSchema } from '$lib/schemas/id-action';
import { requireArbiter, requireCampaignAccess } from '$lib/server/campaigns';
import {
	getStandings,
	getStatReports,
	getStatWarbands,
	getMissionAnalytics,
	getPaintingAwards,
	getAwardsForCommander,
	getAwardForImageWrite,
	setAwardImagePath,
	grantPaintingAward,
	revokePaintingAward
} from '$lib/server/standings';
import { checkImageUpload, saveReportImage, deleteReportImage } from '$lib/server/report-images';
import { canWriteAwardImage } from '$lib/domain/award-image';
import { getWarbandsForCampaign, getWarbandsForCommander } from '$lib/server/warbands';
import { DEFAULT_PROFILE } from '$lib/domain/scoring-profile';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { campaign, role, user } = await parent();
	const isArbiter = role === 'arbiter';
	// Score by the campaign's profile; legacy campaigns with no profile fall back to the default.
	const profile = campaign.scoringProfile ?? DEFAULT_PROFILE;

	// The awards-curation slice still keys off the viewer's own warbands (empty for a non-commander).
	const myWarbands = user?.id ? await getWarbandsForCommander(campaign.id, user.id) : [];

	// The grant panel + full award list is arbiter-only. A commander instead sees the awards on
	// their own warbands so they can attach a painted-models photo (the arbiter curates every one).
	const [
		standings,
		statReports,
		statWarbands,
		missionAnalytics,
		warbands,
		awards,
		myAwards,
		awardForm,
		revokeForm
	] = await Promise.all([
		getStandings(campaign.id, profile, user?.id),
		// The whole campaign log + every warband, so any warband's block and any head-to-head
		// rivalry can be computed client-side (issue #12).
		getStatReports(campaign.id),
		getStatWarbands(campaign.id),
		// Campaign-wide mission win rates / average scores, computed server-side (static, no filters).
		getMissionAnalytics(campaign.id),
		isArbiter ? getWarbandsForCampaign(campaign.id) : Promise.resolve([]),
		isArbiter ? getPaintingAwards(campaign.id, profile) : Promise.resolve([]),
		!isArbiter && user?.id
			? getAwardsForCommander(campaign.id, user.id, profile)
			: Promise.resolve([]),
		superValidate(zod4(paintingAwardSchema), { id: 'award' }),
		// Base form for the per-row revoke buttons; each row overrides the id client-side.
		superValidate(zod4(idActionSchema))
	]);

	return {
		standings,
		statReports,
		statWarbands,
		missionAnalytics,
		// The id of the viewer's commander, so the stats default to their own warbands when present.
		viewerUserId: user?.id ?? null,
		myWarbands,
		isArbiter,
		profile,
		warbands,
		awards,
		myAwards,
		awardForm,
		revokeForm,
		slug: campaign.slug,
		currentCycle: campaign.currentCycle
	};
};

export const actions: Actions = {
	grantAward: async ({ request, params, locals }) => {
		// Granting is an arbiter authority (CONTEXT.md), enforced server-side at the one guard.
		const { campaign, userId } = await requireArbiter(params.slug, locals.user?.id);

		// Read the body once: the grant fields validate via Superforms, the optional image rides
		// alongside as a multipart file the schema doesn't model.
		const formData = await request.formData();
		const form = await superValidate(formData, zod4(paintingAwardSchema), { id: 'award' });
		if (!form.valid) return fail(400, { form });

		const imageCheck = checkImageUpload(formData.get('image'));
		if (imageCheck.kind === 'error') return setError(form, imageCheck.message);

		// Trust the server's view: the warband must belong to this campaign.
		const warbands = await getWarbandsForCampaign(campaign.id);
		if (!warbands.some((w) => w.id === form.data.warbandId)) {
			return setError(form, 'warbandId', 'Choose a warband.');
		}

		// Save the photo before the row so a stored file always has an award; clean it up if the
		// insert fails (mirrors the report-submit flow).
		const imagePath = imageCheck.kind === 'ok' ? await saveReportImage(imageCheck.file) : null;
		try {
			await grantPaintingAward({
				campaignId: campaign.id,
				warbandId: form.data.warbandId,
				cycle: campaign.currentCycle,
				kind: form.data.kind,
				note: form.data.note,
				imagePath,
				grantedByUserId: userId
			});
		} catch (e) {
			if (imagePath) await deleteReportImage(imagePath);
			throw e;
		}
		return message(form, 'Award granted.');
	},

	revokeAward: async ({ request, params, locals }) => {
		const { campaign } = await requireArbiter(params.slug, locals.user?.id);

		// The form id is read from the POST so the response routes back to the right row's form.
		const form = await superValidate(request, zod4(idActionSchema));
		if (!form.valid) return fail(400, { form });
		// Drop the row first, then clean up its photo (the row is the source of truth).
		const { imagePath } = await revokePaintingAward(form.data.id, campaign.id);
		await deleteReportImage(imagePath);
		return message(form, 'Award revoked.');
	},

	// Attach or replace an award's photo. Allowed for the arbiter or the commander of the awarded
	// warband (canWriteAwardImage) — the one rule, checked here as well as on remove.
	setAwardImage: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { imageError: 'Sign in to edit awards.' });
		const { campaign, role } = await requireCampaignAccess(params.slug, locals.user.id);

		const formData = await request.formData();
		const id = String(formData.get('id') ?? '');
		if (!id) return fail(400, { awardId: id, imageError: 'Missing award.' });

		const award = await getAwardForImageWrite(id, campaign.id);
		if (!award) return fail(404, { awardId: id, imageError: 'Award not found.' });
		if (
			!canWriteAwardImage({ role, userId: locals.user.id, commanderUserId: award.commanderUserId })
		)
			return fail(403, { awardId: id, imageError: 'You cannot edit this award.' });

		const imageCheck = checkImageUpload(formData.get('image'));
		if (imageCheck.kind === 'none')
			return fail(400, { awardId: id, imageError: 'Choose a JPEG, PNG, or WebP image.' });
		if (imageCheck.kind === 'error')
			return fail(imageCheck.status, { awardId: id, imageError: imageCheck.message });

		// Save the new file, point the award at it, then remove the prior file — so a member never
		// sees a broken thumbnail and a replaced photo doesn't linger on the volume.
		const newPath = await saveReportImage(imageCheck.file);
		try {
			await setAwardImagePath(id, campaign.id, newPath);
		} catch (e) {
			await deleteReportImage(newPath);
			throw e;
		}
		await deleteReportImage(award.imagePath);
		return { awardId: id, imageOk: true };
	},

	// Remove an award's photo and clean up the stored file. Same write rule as setAwardImage.
	removeAwardImage: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401);
		const { campaign, role } = await requireCampaignAccess(params.slug, locals.user.id);

		const form = await superValidate(request, zod4(idActionSchema));
		if (!form.valid) return fail(400, { form });

		const award = await getAwardForImageWrite(form.data.id, campaign.id);
		if (!award) return fail(404, { form });
		if (
			!canWriteAwardImage({ role, userId: locals.user.id, commanderUserId: award.commanderUserId })
		)
			return fail(403, { form });

		await setAwardImagePath(form.data.id, campaign.id, null);
		await deleteReportImage(award.imagePath);
		return message(form, 'Image removed.');
	}
};
