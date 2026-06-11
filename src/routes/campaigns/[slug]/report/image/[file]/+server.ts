import { error } from '@sveltejs/kit';
import { requireCampaignAccess } from '$lib/server/campaigns';
import { imageInCampaign } from '$lib/server/reports';
import { readReportImage } from '$lib/server/report-images';
import type { RequestHandler } from './$types';

/**
 * Stream a stored scoresheet. The images live outside `static/` on the data volume, so they
 * are only reachable through this gate: a logged-in member of the campaign, and the filename
 * must belong to a report in *this* campaign. Names are unguessable UUIDs, but the ownership
 * check still stops a member of one campaign reading another's scoresheet by id.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Sign in to view scoresheets');
	const { campaign } = await requireCampaignAccess(params.slug, locals.user.id);

	if (!(await imageInCampaign(campaign.id, params.file))) throw error(404, 'Not found');
	const image = await readReportImage(params.file);
	if (!image) throw error(404, 'Not found');

	return new Response(new Uint8Array(image.body), {
		headers: {
			'content-type': image.contentType,
			// Campaign-scoped evidence — never let a shared cache hold it.
			'cache-control': 'private, max-age=300'
		}
	});
};
