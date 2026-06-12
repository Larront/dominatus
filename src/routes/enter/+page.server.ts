import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// The sign-in / enlist terminal. An already-authenticated commander has no business here — send
// them to the hub. Anonymous visitors land here from the splash CTA and from auth-gated routes.
export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/');
	return {};
};
