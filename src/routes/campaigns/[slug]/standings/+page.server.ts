import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate, message, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { paintingAwardSchema } from '$lib/schemas/painting-award';
import { idActionSchema } from '$lib/schemas/id-action';
import { requireCampaignAccess } from '$lib/server/campaigns';
import {
	getStandings,
	getPaintingAwards,
	grantPaintingAward,
	revokePaintingAward
} from '$lib/server/standings';
import { getWarbandsForCampaign } from '$lib/server/warbands';
import { DEFAULT_PROFILE } from '$lib/domain/scoring-profile';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { campaign, role, user } = await parent();
	const isArbiter = role === 'arbiter';
	// Score by the campaign's profile; legacy campaigns with no profile fall back to the default.
	const profile = campaign.scoringProfile ?? DEFAULT_PROFILE;

	// The award panel (warband picker + recent grants) is arbiter-only, so only load it then.
	const [standings, warbands, awards, awardForm, revokeForm] = await Promise.all([
		getStandings(campaign.id, profile, user?.id),
		isArbiter ? getWarbandsForCampaign(campaign.id) : Promise.resolve([]),
		isArbiter ? getPaintingAwards(campaign.id, profile) : Promise.resolve([]),
		superValidate(zod4(paintingAwardSchema), { id: 'award' }),
		// Base form for the per-row revoke buttons; each row overrides the id client-side.
		superValidate(zod4(idActionSchema))
	]);

	return {
		standings,
		isArbiter,
		profile,
		warbands,
		awards,
		awardForm,
		revokeForm,
		currentCycle: campaign.currentCycle
	};
};

export const actions: Actions = {
	grantAward: async ({ request, params, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const { campaign, role } = await requireCampaignAccess(params.slug, locals.user.id);
		// Granting is an arbiter authority (CONTEXT.md), enforced server-side, not just hidden in UI.
		if (role !== 'arbiter') error(403, 'Only the arbiter can grant awards.');

		const form = await superValidate(request, zod4(paintingAwardSchema), { id: 'award' });
		if (!form.valid) return fail(400, { form });

		// Trust the server's view: the warband must belong to this campaign.
		const warbands = await getWarbandsForCampaign(campaign.id);
		if (!warbands.some((w) => w.id === form.data.warbandId)) {
			return setError(form, 'warbandId', 'Choose a warband.');
		}

		await grantPaintingAward({
			campaignId: campaign.id,
			warbandId: form.data.warbandId,
			cycle: campaign.currentCycle,
			kind: form.data.kind,
			note: form.data.note,
			grantedByUserId: locals.user.id
		});
		return message(form, 'Award granted.');
	},

	revokeAward: async ({ request, params, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const { campaign, role } = await requireCampaignAccess(params.slug, locals.user.id);
		if (role !== 'arbiter') error(403, 'Only the arbiter can revoke awards.');

		// The form id is read from the POST so the response routes back to the right row's form.
		const form = await superValidate(request, zod4(idActionSchema));
		if (!form.valid) return fail(400, { form });
		await revokePaintingAward(form.data.id, campaign.id);
		return message(form, 'Award revoked.');
	}
};
