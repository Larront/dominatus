import { fail, redirect } from '@sveltejs/kit';
import { version } from '$app/environment';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { feedbackSchema } from '$lib/schemas/feedback';
import { sendFeedbackEmail } from '$lib/server/email';
import type { PageServerLoad, Actions } from './$types';

// Only a local, same-origin path is a safe place to send the commander back to — anything else
// (a scheme, a protocol-relative `//host`) is rejected so the back link can't become an open redirect.
function safeFrom(raw: string | null): string | null {
	if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null;
	return raw;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(302, '/enter');

	return {
		form: await superValidate(zod4(feedbackSchema)),
		user: locals.user,
		from: safeFrom(url.searchParams.get('from'))
	};
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		if (!locals.user) redirect(302, '/enter');

		const form = await superValidate(request, zod4(feedbackSchema));
		if (!form.valid) return fail(400, { form });

		await sendFeedbackEmail({
			type: form.data.type,
			message: form.data.message,
			reporter: { name: locals.user.name, email: locals.user.email },
			// Where the commander was when they opened the form — useful triage context.
			context: safeFrom(url.searchParams.get('from')) ?? undefined,
			// Stamp the build the report was filed against.
			appVersion: version
		});

		return message(form, 'Transmission received — thank you for the intel.');
	}
};
