import type { Handle, HandleServerError } from '@sveltejs/kit';
import { building } from '$app/environment';
import { sequence } from '@sveltejs/kit/hooks';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { log } from '$lib/server/log';

// Outermost: mint a request id, expose a request-scoped child logger on locals, and emit one
// structured line per request once it resolves. Runs first in the sequence so its timer wraps
// auth + routing; locals.user is populated by the inner auth handler before `resolve` returns,
// so the userId is available here.
const handleLog: Handle = async ({ event, resolve }) => {
	const requestId = crypto.randomUUID();
	event.locals.log = log.child({ requestId });

	const start = performance.now();
	const response = await resolve(event);
	// Skip the health check — it fires every 30s and would drown the log.
	if (event.url.pathname !== '/healthz') {
		event.locals.log.info(
			{
				method: event.request.method,
				path: event.url.pathname,
				status: response.status,
				ms: Math.round(performance.now() - start),
				userId: event.locals.user?.id ?? null
			},
			'request'
		);
	}
	return response;
};

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = sequence(handleLog, handleBetterAuth);

// Log unexpected server errors (500s). SvelteKit hides the error from the client for safety;
// this is where it gets recorded for ops. `err` is pino's conventional key for its Error
// serializer (captures type, message, stack).
export const handleError: HandleServerError = ({ error, event, status, message }) => {
	log.error({ path: event.url.pathname, status, err: error }, message);
};
