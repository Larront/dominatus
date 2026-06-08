import { redirect } from '@sveltejs/kit';
import { getUserCampaigns } from '$lib/server/campaigns';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	return { campaigns: await getUserCampaigns(locals.user.id) };
};
