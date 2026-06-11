import type { Handle, HandleServerError } from '@sveltejs/kit';
import { building } from '$app/environment';
import { sequence } from '@sveltejs/kit/hooks';
import { env } from '$env/dynamic/private';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { log } from '$lib/server/log';

// HSTS only makes sense (and is only honoured) over HTTPS, so gate it on the prod https ORIGIN —
// same single-env-var dev/prod split used for secure cookies. Localhost dev stays plain http.
const isHttps = env.ORIGIN?.startsWith('https://') ?? false;

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

// Static security response headers applied to every response (pages, API, auth). CSP is handled
// separately and is *not* set here — see docs/OPERATIONS.md / DEPLOYMENT.md: it needs the Google
// Fonts hosts allowlisted and a per-route browser check (SvelteKit's nonce/hash mode conflicts with
// SSR'd inline style attributes), so it's a deploy-time/edge task rather than a blind default.
const handleSecurityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	if (isHttps) {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
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

export const handle: Handle = sequence(handleLog, handleSecurityHeaders, handleBetterAuth);

// Log unexpected server errors (500s). SvelteKit hides the error from the client for safety;
// this is where it gets recorded for ops. `err` is pino's conventional key for its Error
// serializer (captures type, message, stack).
export const handleError: HandleServerError = ({ error, event, status, message }) => {
	log.error({ path: event.url.pathname, status, err: error }, message);
};
