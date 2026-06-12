import { redirect } from '@sveltejs/kit';
import { requireCampaignAccess } from '$lib/server/campaigns';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals }) => {
	if (!locals.user) redirect(302, '/enter');
	const { campaign, role } = await requireCampaignAccess(params.slug, locals.user.id);
	return { campaign, role };
};
