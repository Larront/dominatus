import { fail, redirect } from '@sveltejs/kit';
import { superValidate, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { joinCampaignSchema } from '$lib/schemas/campaign-create';
import { getUserCampaigns, joinCampaign } from '$lib/server/campaigns';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// The root is the hub, not a redirect: anonymous visitors get the access gate rendered
	// client-side, members get their roster plus the join form. Founding now has its own page.
	if (!locals.user) {
		return { user: null, campaigns: [], joinForm: null };
	}

	const [campaigns, joinForm] = await Promise.all([
		getUserCampaigns(locals.user.id),
		superValidate(zod4(joinCampaignSchema), { id: 'join' })
	]);

	return { user: locals.user, campaigns, joinForm };
};

export const actions: Actions = {
	join: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/');

		const form = await superValidate(request, zod4(joinCampaignSchema), { id: 'join' });
		if (!form.valid) return fail(400, { joinForm: form });

		const result = await joinCampaign({ code: form.data.code, userId: locals.user.id });
		if (!result.ok) {
			return setError(
				form,
				'code',
				result.reason === 'not-found'
					? 'No campaign answers to that code.'
					: 'You already serve in that campaign.'
			);
		}

		redirect(303, `/campaigns/${result.slug}`);
	}
};
