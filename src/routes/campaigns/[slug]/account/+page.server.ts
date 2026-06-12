import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { warbandSchema } from '$lib/schemas/warband';
import { requireCampaignAccess } from '$lib/server/campaigns';
import { getWarbandsForCommander, createWarband } from '$lib/server/warbands';
import { arbiterCampaignsFor } from '$lib/server/account-deletion';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { campaign } = await parent();
	// `parent()` (the layout load) already redirected an anonymous visitor; this is belt-and-braces.
	if (!locals.user) redirect(302, '/enter');

	const [form, warbands, arbiterCampaigns] = await Promise.all([
		superValidate(zod4(warbandSchema)),
		getWarbandsForCommander(campaign.id, locals.user.id),
		// Account deletion is blocked while the user arbiters any campaign — surfaced in the UI.
		arbiterCampaignsFor(locals.user.id)
	]);
	// Seed the colour the commander confirms — an empty native picker would default to black.
	form.data.color = '#5f93c4';

	return { form, warbands, arbiterCampaigns };
};

export const actions: Actions = {
	createWarband: async ({ request, params, locals }) => {
		// A warband is mustered by the logged-in member who will command it.
		if (!locals.user) redirect(302, '/enter');
		const { campaign } = await requireCampaignAccess(params.slug, locals.user.id);

		const form = await superValidate(request, zod4(warbandSchema));
		if (!form.valid) return fail(400, { form });

		const result = await createWarband({
			...form.data,
			campaignId: campaign.id,
			commanderUserId: locals.user.id
		});
		if (!result.ok) {
			return setError(form, 'short', `Tag "${form.data.short}" is already taken in this campaign.`);
		}

		return message(form, `${form.data.name} mustered.`);
	}
};
