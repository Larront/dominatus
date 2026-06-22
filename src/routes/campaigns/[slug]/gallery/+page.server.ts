import { fail } from '@sveltejs/kit';
import { superValidate, message, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { paintingAwardSchema } from '$lib/schemas/painting-award';
import { idActionSchema } from '$lib/schemas/id-action';
import { requireArbiter, requireCampaignAccess } from '$lib/server/campaigns';
import {
	getGalleryAwards,
	getPaintingAwards,
	getAwardsForCommander,
	getAwardForImageWrite,
	setAwardImagePath,
	grantPaintingAward,
	updatePaintingAward,
	revokePaintingAward
} from '$lib/server/standings';
import { checkImageUpload, saveReportImage, deleteReportImage } from '$lib/server/report-images';
import { canWriteAwardImage } from '$lib/domain/award-image';
import { getWarbandsForCampaign } from '$lib/server/warbands';
import { DEFAULT_PROFILE } from '$lib/domain/scoring-profile';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	// Members-only is enforced by the campaign layout (requireCampaignAccess). The gallery shows the
	// whole campaign's painted-models photos; the painting-award controls live here too, since this
	// is the home of everything painting-related (issue #15).
	const { campaign, role, user } = await parent();
	const isArbiter = role === 'arbiter';
	// Awards are worth points under the campaign's profile; legacy campaigns fall back to the default.
	const profile = campaign.scoringProfile ?? DEFAULT_PROFILE;

	// The grant panel + full award list is arbiter-only. A commander instead sees the awards on their
	// own warbands so they can attach a painted-models photo (the arbiter curates every one).
	const [images, warbands, awards, myAwards, awardForm, revokeForm] = await Promise.all([
		getGalleryAwards(campaign.id),
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
		images,
		isArbiter,
		warbands,
		awards,
		myAwards,
		awardForm,
		revokeForm,
		slug: campaign.slug
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

	// Edit an existing award's grant fields (arbiter only) — correcting a wrong warband, kind, or
	// note without revoking and re-granting. Validates against the same schema as a grant; the photo
	// is curated separately via setAwardImage. Returns plain `{ editId, ... }` so the inline editor
	// (native enhance, not Superforms) can match the response to its row.
	editAward: async ({ request, params, locals }) => {
		const { campaign } = await requireArbiter(params.slug, locals.user?.id);

		const formData = await request.formData();
		const id = String(formData.get('id') ?? '');
		if (!id) return fail(400, { editId: id, editError: 'Missing award.' });

		const parsed = paintingAwardSchema.safeParse({
			warbandId: String(formData.get('warbandId') ?? ''),
			kind: String(formData.get('kind') ?? ''),
			note: String(formData.get('note') ?? '')
		});
		if (!parsed.success)
			return fail(400, {
				editId: id,
				editError: parsed.error.issues[0]?.message ?? 'Invalid edit.'
			});

		// Trust the server's view: the warband must belong to this campaign.
		const warbands = await getWarbandsForCampaign(campaign.id);
		if (!warbands.some((w) => w.id === parsed.data.warbandId))
			return fail(400, { editId: id, editError: 'Choose a warband.' });

		await updatePaintingAward(id, campaign.id, parsed.data);
		return { editId: id, editOk: true };
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
