import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { sendEmail } from '$lib/server/email';

// Secure cookies and trusted origins both derive from ORIGIN, so a single env var drives the
// dev/prod split: dev runs http://localhost:5173 (no Secure flag — browsers won't store Secure
// cookies over http), prod runs https://dominatus.larront.com (Secure on). adapter-node also reads
// ORIGIN, so request URLs resolve as https behind the Cloudflare tunnel without PROTOCOL_HEADER/
// HOST_HEADER. Gating here is what keeps localhost dev working — an ungated Secure flag breaks it.
const useSecureCookies = env.ORIGIN?.startsWith('https://') ?? false;

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	// Better Auth rejects cross-origin requests not in this list. baseURL is trusted implicitly, but
	// set it explicitly so the public origin is legible and the prod hostname is the single source.
	trustedOrigins: env.ORIGIN ? [env.ORIGIN] : [],
	advanced: { useSecureCookies },
	// Brute-force / abuse protection on the auth endpoints, per-IP. `enabled` is left to Better
	// Auth's default (on when NODE_ENV===production, which the container sets and `bun run dev`
	// + vitest do not) so the dev loop and tests are untouched. RATE_LIMIT_ENABLED overrides:
	// 'true' force-enables for a localhost smoke test, 'false' is a prod kill-switch. Memory-backed
	// (fine for a single container; counters reset on restart). Keys are exact paths under /api/auth.
	rateLimit: {
		enabled: env.RATE_LIMIT_ENABLED ? env.RATE_LIMIT_ENABLED === 'true' : undefined,
		customRules: {
			'/sign-in/email': { window: 60, max: 5 },
			'/sign-up/email': { window: 60, max: 5 },
			'/request-password-reset': { window: 60, max: 3 },
			'/forget-password': { window: 60, max: 3 },
			'/reset-password': { window: 60, max: 5 },
			'/send-verification-email': { window: 60, max: 3 }
		}
	},
	database: drizzleAdapter(db, { provider: 'sqlite' }),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		sendResetPassword: async ({ user, url }) => {
			await sendEmail({
				to: user.email,
				subject: 'Reset your Dominatus password',
				html: `<p>Click below to choose a new password:</p><p><a href="${url}">Reset password</a></p><p>If you didn't request this, you can ignore this email.</p>`
			});
		}
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, url }) => {
			await sendEmail({
				to: user.email,
				subject: 'Verify your email for Dominatus',
				html: `<p>Welcome to Dominatus. Confirm your email to finish signing up:</p><p><a href="${url}">Verify email</a></p>`
			});
		}
	},
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID ?? '',
			clientSecret: env.GOOGLE_CLIENT_SECRET ?? ''
		},
		facebook: {
			clientId: env.FACEBOOK_CLIENT_ID ?? '',
			clientSecret: env.FACEBOOK_CLIENT_SECRET ?? ''
		}
	},
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
