import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { campaignDetailsSchema } from '$lib/schemas/campaign-details';
import { scoringProfileSchema } from '$lib/domain/scoring-profile';
import { worldEditSchema, type WorldEditInput } from '$lib/schemas/campaign-founding';
import { idActionSchema } from '$lib/schemas/id-action';
import { effectSchema, effectEditSchema, worldEffectSchema } from '$lib/schemas/planetary-effect';
import {
	requireArbiter,
	updateCampaignDetails,
	regenerateJoinCode,
	updateScoringProfile,
	getCampaignMembers,
	transferArbiterRole
} from '$lib/server/campaigns';
import { getCampaignReportsAdmin, deleteBattleReport } from '$lib/server/reports';
import { deleteReportImage } from '$lib/server/report-images';
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

	const [detailsForm, profileForm, deleteForm, createForm, reports, effects, worlds] =
		await Promise.all([
			superValidate(
				{
					name: campaign.name,
					subtitle: campaign.subtitle ?? '',
					currentCycle: campaign.currentCycle
				},
				zod4(campaignDetailsSchema),
				{ id: 'details' }
			),
			superValidate(campaign.scoringProfile ?? DEFAULT_PROFILE, zod4(scoringProfileSchema), {
				id: 'profile'
			}),
			// Base form for the per-row id-only destructive buttons (reverse a report, remove an effect);
			// each DestructiveForm overrides the id client-side.
			superValidate(zod4(idActionSchema)),
			// The "add effect" form is a single form; the edit forms below are one per row.
			superValidate(zod4(effectSchema), { id: 'effect-create' }),
			getCampaignReportsAdmin(campaign.id),
			getEffectPool(campaign.id),
			getWorldsWithControl(campaign.id)
		]);

	// Members the arbiter can hand the role to (the role swap happens via the transferArbiter action).
	const members = await getCampaignMembers(campaign.id);

	// One validated, pre-filled form per editable row, keyed by record id. Each gets a unique form id
	// so a save response routes back to the row it came from (a shared id would update every row).
	const effectForms = Object.fromEntries(
		await Promise.all(
			effects.map(
				async (e) =>
					[
						e.id,
						await superValidate(
							{ id: e.id, title: e.title, description: e.description ?? '' },
							zod4(effectEditSchema),
							{ id: `effect-${e.id}` }
						)
					] as const
			)
		)
	);
	const worldForms = Object.fromEntries(
		await Promise.all(
			worlds.map(
				async (w) =>
					[
						w.id,
						await superValidate(
							{
								worldId: w.id,
								name: w.name,
								type: w.type,
								render: w.render as WorldEditInput['render'],
								value: w.value ?? '',
								garrison: w.garrison ?? '',
								supply: w.supply ?? '',
								description: w.description ?? ''
							},
							zod4(worldEditSchema),
							{ id: `world-${w.id}` }
						)
					] as const
			)
		)
	);

	return {
		detailsForm,
		profileForm,
		deleteForm,
		createForm,
		reports,
		effects,
		worlds,
		effectForms,
		worldForms,
		members
	};
};

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
		const form = await superValidate(request, zod4(effectSchema), { id: 'effect-create' });
		if (!form.valid) return fail(400, { form });
		await createEffect(campaign.id, form.data);
		return message(form, 'Effect added.');
	},

	editEffect: async ({ request, params, locals }) => {
		const { campaign } = await requireArbiter(params.slug, locals.user?.id);
		// The form id (effect-<id>) is read from the POST, so the response routes back to its row.
		const form = await superValidate(request, zod4(effectEditSchema));
		if (!form.valid) return fail(400, { form });
		const { id, ...fields } = form.data;
		await updateEffect(id, campaign.id, fields);
		return message(form, 'Saved.');
	},

	deleteEffect: async ({ request, params, locals }) => {
		const { campaign } = await requireArbiter(params.slug, locals.user?.id);
		const form = await superValidate(request, zod4(idActionSchema));
		if (!form.valid) return fail(400, { form });
		await deleteEffect(form.data.id, campaign.id);
		return message(form, 'Removed from pool.');
	},

	// Attach/detach are plain command toggles — two server-rendered ids, no user input to validate —
	// so they post directly and the ids are re-checked against the campaign server-side.
	attachEffect: async ({ request, params, locals }) => {
		const { campaign } = await requireArbiter(params.slug, locals.user?.id);
		const parsed = worldEffectSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { attachError: 'Missing world or effect.' });
		await attachEffect(campaign.id, parsed.data.worldId, parsed.data.effectId);
		return { attach: 'on' };
	},

	detachEffect: async ({ request, params, locals }) => {
		const { campaign } = await requireArbiter(params.slug, locals.user?.id);
		const parsed = worldEffectSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { attachError: 'Missing world or effect.' });
		await detachEffect(campaign.id, parsed.data.worldId, parsed.data.effectId);
		return { attach: 'off' };
	},

	saveWorld: async ({ request, params, locals }) => {
		const { campaign } = await requireArbiter(params.slug, locals.user?.id);
		// The form id (world-<id>) is read from the POST, so the response routes back to its row.
		const form = await superValidate(request, zod4(worldEditSchema));
		if (!form.valid) return fail(400, { form });
		const { worldId, ...fields } = form.data;
		await updateWorld(worldId, campaign.id, fields);
		return message(form, 'World saved.');
	},

	deleteReport: async ({ request, params, locals }) => {
		const { campaign } = await requireArbiter(params.slug, locals.user?.id);
		// The form id is read from the POST so the response routes back to the right row's form.
		const form = await superValidate(request, zod4(idActionSchema));
		if (!form.valid) return fail(400, { form });
		const { imagePath } = deleteBattleReport(form.data.id, campaign.id);
		await deleteReportImage(imagePath); // drop the scoresheet now the report is gone
		return message(form, 'Report deleted. Standings and control recalculated.');
	},

	transferArbiter: async ({ request, params, locals }) => {
		const { campaign } = await requireArbiter(params.slug, locals.user?.id);
		const toUserId = String((await request.formData()).get('toUserId') ?? '');
		if (!toUserId) return fail(400, { transferError: 'Choose a commander to transfer to.' });

		const result = transferArbiterRole(campaign.id, toUserId);
		if (!result.ok) {
			return fail(400, {
				transferError:
					result.reason === 'same'
						? 'That commander already holds the arbiter role.'
						: 'That commander is not a member of this campaign.'
			});
		}
		// The caller is no longer the arbiter — drop them back to the campaign as a commander.
		redirect(303, `/campaigns/${campaign.slug}`);
	}
};
