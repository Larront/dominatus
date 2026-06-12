import { redirect } from '@sveltejs/kit';
import { arbiterCampaignsFor } from '$lib/server/account-deletion';
import type { PageServerLoad } from './$types';

// Global, campaign-independent account page so a user with no campaigns can still manage (and
// delete) their account. Account deletion is blocked while they arbiter a campaign — see the load.
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/enter');

	return {
		user: locals.user,
		arbiterCampaigns: await arbiterCampaignsFor(locals.user.id)
	};
};
