import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { sendEmail, brandedEmail } from '$lib/server/email';
import { anonymizeDepartingUser } from '$lib/server/account-deletion';

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
				html: brandedEmail({
					kicker: '// Cipher Reset',
					heading: 'Reset your password',
					body: 'A new access cipher was requested for your Dominatus account. Choose a new password with the link below.',
					ctaLabel: 'Reset password',
					ctaUrl: url,
					footnote:
						"If you didn't request this, you can safely ignore this message — your password stays as it is."
				})
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
				html: brandedEmail({
					kicker: '// Verify Transmission',
					heading: 'Confirm your enlistment',
					body: 'Welcome to Dominatus, commander. Confirm your email to finish enlisting and take the field.',
					ctaLabel: 'Verify email',
					ctaUrl: url
				})
			});
		}
	},
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID ?? '',
			clientSecret: env.GOOGLE_CLIENT_SECRET ?? ''
		}
	},
	user: {
		deleteUser: {
			enabled: true,
			// Email-confirm flow works uniformly for password and Google-only users (no password to
			// re-enter). The link hits Better Auth's /delete-user/callback, which runs beforeDelete.
			sendDeleteAccountVerification: async ({ user, url }) => {
				await sendEmail({
					to: user.email,
					subject: 'Confirm account deletion — Dominatus',
					html: brandedEmail({
						kicker: '// Discharge Order',
						heading: 'Confirm account deletion',
						body: 'You asked to delete your Dominatus account — this is permanent. Your warbands and battle history stay on record under "Deleted Commander" so campaign standings hold; your login and memberships are removed.',
						ctaLabel: 'Confirm deletion',
						ctaUrl: url,
						footnote: "If you didn't request this, ignore this email — nothing happens."
					})
				});
			},
			// Reassign the departing commander's data to the tombstone before the row is removed.
			beforeDelete: async (u) => {
				await anonymizeDepartingUser(u.id);
			}
		}
	},
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
