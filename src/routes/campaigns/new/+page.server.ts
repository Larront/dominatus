import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { foundingSchema } from '$lib/schemas/campaign-founding';
import { DEFAULT_PROFILE } from '$lib/domain/scoring-profile';
import { generateSystem } from '$lib/domain/archetypes';
import { createCampaign } from '$lib/server/campaigns';
import type { PageServerLoad, Actions } from './$types';

const INITIAL_WORLDS = 3;

export const load: PageServerLoad = async ({ locals }) => {
	// Founding is an arbiter act — you must be signed in to take it on.
	if (!locals.user) redirect(302, '/login');

	// Seed the form with a rolled system so the page opens with a system to react to, not a blank
	// slate. The client reshuffles from here; this is just the first roll.
	const form = await superValidate(
		{
			name: '',
			subtitle: '',
			worlds: generateSystem(INITIAL_WORLDS, Date.now() >>> 0),
			scoringProfile: DEFAULT_PROFILE,
			effects: []
		},
		zod4(foundingSchema),
		{ errors: false }
	);

	return { form };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');

		const form = await superValidate(request, zod4(foundingSchema));
		if (!form.valid) return fail(400, { form });

		const { slug } = createCampaign({
			name: form.data.name,
			subtitle: form.data.subtitle || null,
			arbiterUserId: locals.user.id,
			scoringProfile: form.data.scoringProfile,
			worlds: form.data.worlds,
			effects: form.data.effects
		});

		// Drop the new arbiter straight onto their freshly-forged system map.
		redirect(303, `/campaigns/${slug}`);
	}
};
