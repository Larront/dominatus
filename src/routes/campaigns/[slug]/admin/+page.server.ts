import { error, fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { campaignDetailsSchema } from '$lib/schemas/campaign-details';
import { scoringProfileSchema } from '$lib/domain/scoring-profile';
import { foundingWorldSchema } from '$lib/schemas/campaign-founding';
import { idActionSchema } from '$lib/schemas/id-action';
import {
	requireArbiter,
	updateCampaignDetails,
	regenerateJoinCode,
	updateScoringProfile
} from '$lib/server/campaigns';
import { getCampaignReportsAdmin, deleteBattleReport } from '$lib/server/reports';
import { getWorldsWithControl, updateWorld } from '$lib/server/worlds';
import { DEFAULT_PROFILE } from '$lib/domain/scoring-profile';
import {
	getEffectPool,
	createEffect,
	updateEffect,
	deleteEffect,
	attachEffect,
	detachEffect
} from '$lib/server/planetary-effects';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { campaign, role } = await parent();
	// The admin panel is the arbiter's alone (CONTEXT.md — campaign authority).
	if (role !== 'arbiter') error(403, 'Only the arbiter can manage this campaign');

	const [detailsForm, profileForm, deleteForm, reports, effects, worlds] = await Promise.all([
		superValidate(
			{ name: campaign.name, subtitle: campaign.subtitle ?? '', currentCycle: campaign.currentCycle },
			zod4(campaignDetailsSchema),
			{ id: 'details' }
		),
		superValidate(campaign.scoringProfile ?? DEFAULT_PROFILE, zod4(scoringProfileSchema), {
			id: 'profile'
		}),
		// Base form for the per-row reverse buttons; each row overrides the id client-side.
		superValidate(zod4(idActionSchema)),
		getCampaignReportsAdmin(campaign.id),
		getEffectPool(campaign.id),
		getWorldsWithControl(campaign.id)
	]);
	return { detailsForm, profileForm, deleteForm, reports, effects, worlds };
};

/** Pull a trimmed string field out of a posted form. */
const str = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();

export const actions: Actions = {
	saveDetails: async ({ request, params, locals }) => {
		const { campaign } = await requireArbiter(params.slug, locals.user?.id);

		const form = await superValidate(request, zod4(campaignDetailsSchema), { id: 'details' });
		if (!form.valid) return fail(400, { form });

		await updateCampaignDetails(campaign.id, {
			name: form.data.name,
			subtitle: form.data.subtitle || null,
			currentCycle: form.data.currentCycle
		});
		return message(form, 'Saved.');
	},

	saveProfile: async ({ request, params, locals }) => {
		const { campaign } = await requireArbiter(params.slug, locals.user?.id);

		const form = await superValidate(request, zod4(scoringProfileSchema), { id: 'profile' });
		if (!form.valid) return fail(400, { form });

		await updateScoringProfile(campaign.id, form.data);
		return message(form, 'Scoring updated. Standings re-scored.');
	},

	regenerateCode: async ({ params, locals }) => {
		const { campaign } = await requireArbiter(params.slug, locals.user?.id);
		const joinCode = regenerateJoinCode(campaign.id);
		return { joinCode };
	},

	createEffect: async ({ request, params, locals }) => {
		const { campaign } = await requireArbiter(params.slug, locals.user?.id);
		const fd = await request.formData();
		const title = str(fd, 'title');
		if (!title) return fail(400, { effectError: 'Name the effect.' });
		await createEffect(campaign.id, { title, description: str(fd, 'description') });
		return { effect: 'created' };
	},

	editEffect: async ({ request, params, locals }) => {
		const { campaign } = await requireArbiter(params.slug, locals.user?.id);
		const fd = await request.formData();
		const id = str(fd, 'id');
		const title = str(fd, 'title');
		if (!id || !title) return fail(400, { effectError: 'Name the effect.' });
		await updateEffect(id, campaign.id, { title, description: str(fd, 'description') });
		return { effect: 'edited' };
	},

	deleteEffect: async ({ request, params, locals }) => {
		const { campaign } = await requireArbiter(params.slug, locals.user?.id);
		const fd = await request.formData();
		const id = str(fd, 'id');
		if (id) await deleteEffect(id, campaign.id);
		return { effect: 'deleted' };
	},

	attachEffect: async ({ request, params, locals }) => {
		const { campaign } = await requireArbiter(params.slug, locals.user?.id);
		const fd = await request.formData();
		await attachEffect(campaign.id, str(fd, 'worldId'), str(fd, 'effectId'));
		return { attach: 'on' };
	},

	detachEffect: async ({ request, params, locals }) => {
		const { campaign } = await requireArbiter(params.slug, locals.user?.id);
		const fd = await request.formData();
		await detachEffect(campaign.id, str(fd, 'worldId'), str(fd, 'effectId'));
		return { attach: 'off' };
	},

	saveWorld: async ({ request, params, locals }) => {
		const { campaign } = await requireArbiter(params.slug, locals.user?.id);
		const fd = await request.formData();
		const worldId = str(fd, 'worldId');
		const parsed = foundingWorldSchema.safeParse({
			name: str(fd, 'name'),
			type: str(fd, 'type'),
			render: str(fd, 'render'),
			value: str(fd, 'value'),
			garrison: str(fd, 'garrison'),
			supply: str(fd, 'supply'),
			description: str(fd, 'description')
		});
		if (!worldId || !parsed.success) return fail(400, { worldError: 'Check the world fields.' });
		await updateWorld(worldId, campaign.id, parsed.data);
		return { world: 'saved' };
	},

	deleteReport: async ({ request, params, locals }) => {
		const { campaign } = await requireArbiter(params.slug, locals.user?.id);
		// The form id is read from the POST so the response routes back to the right row's form.
		const form = await superValidate(request, zod4(idActionSchema));
		if (!form.valid) return fail(400, { form });
		deleteBattleReport(form.data.id, campaign.id);
		return message(form, 'Report reversed.');
	}
};
