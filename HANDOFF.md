# Handoff — Deployment readiness for Dominatus

**Date:** 2026-06-10
**Focus:** Preparing the app for production deployment (Docker + Cloudflare Tunnel).

## Source of truth

`DEPLOYMENT.md` (project root) is the living checklist — decisions, what's done (`[x]`), and what's left (`[ ]`). Read it first. This doc covers context that isn't in there.

## What this session did

Completed two chunks of the deployment work:

1. **Buildable/runnable container** — swapped `adapter-auto` → `adapter-node`, added `Dockerfile` (multi-stage bun build, compiles `better-sqlite3`, non-root, migrate-then-start), `.dockerignore`, `docker-compose.yml` (named volume `dominatus-data` → `/data`), `scripts/migrate.js` (programmatic Drizzle migrator — no `drizzle-kit` at runtime), `src/routes/healthz/+server.ts`, and rewrote `.env.example`.
2. **Email + SSO** — `src/lib/server/email.ts` (Resend, dev-safe: logs the link when no API key), wired `requireEmailVerification` + `sendOnSignUp` + `sendResetPassword` into `src/lib/server/auth.ts`, added Google + Facebook `socialProviders`, and `src/lib/components/SocialSignIn.svelte` (used on login + signup). Signup now shows a "check your inbox" state.

All changes are **uncommitted** on `main`. `bun run build` and `bun run check` both pass (0 errors/warnings). Svelte components validated via the Svelte MCP autofixer.

## Key facts / gotchas for the next agent

- **Package manager is `bun`, not npm.** Lockfile is `bun.lock`. (An npm run early in the session created and then removed `package-lock.json`.)
- **No new DB migration was needed** for email/social — the `user`/`session`/`account`/`verification` tables already exist in migration `drizzle/0000_*.sql`.
- **`db:push` is dev-only** and deliberately kept out of the deploy path; production migrates via `scripts/migrate.js` on container startup.
- **Docker build has NOT been run/verified** — no Docker available in this session. Verifying `docker compose up` is an open task.
- Better Auth callback shapes confirmed against installed v1.4.x: `sendResetPassword`/`sendVerificationEmail` receive `{ user, url, token }`.

## Recommended next steps (in priority order)

1. **Finish auth UX** — `/reset-password` page (the reset email links to it but it 404s), "forgot password?" request form, "resend verification", sign-out control, custom `+error.svelte`. See `DEPLOYMENT.md` → "Auth UX gaps".
2. **Verify the Docker build** actually runs end-to-end.
3. **Ingress + secure cookies** behind Cloudflare (see "Ingress" section — cookie `Secure` flag + proxy headers are the risk).
4. **Security/observability/ops** — rate limiting, error tracking, backups+restore test, CI/CD. See respective sections.

## External action items (user-side, cannot be done in-repo)

Tracked at the bottom of `DEPLOYMENT.md`: Resend domain + DNS (SPF/DKIM/DMARC) + `RESEND_API_KEY`; Google & Meta OAuth apps + redirect URIs + client secrets; Cloudflare tunnel credentials. **No secrets are committed** — `.env` holds only a dev-grade `BETTER_AUTH_SECRET`; production secret must be regenerated (`openssl rand -base64 32`) and host-injected.

## Suggested skills for the next session

- **`run` / `verify`** — to run the container and confirm the build + auth flows work end-to-end.
- **`svelte:svelte-file-editor`** (and the Svelte MCP autofixer) — required when building the `/reset-password` page and other `.svelte` work.
- **`claude-api`** — only if any LLM/Anthropic features get added; not relevant to current deployment tasks.
