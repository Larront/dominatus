# Deployment Checklist

Target: Docker container behind a Cloudflare Tunnel, SQLite on a mounted volume.

## Decisions

- **Adapter:** `@sveltejs/adapter-node` (standalone server in the container)
- **Database:** SQLite (`better-sqlite3`) on a mounted Docker volume
- **Migrations:** `drizzle-kit migrate` on startup — `db:push` is dev-only, kept out of the deploy path
- **Ingress:** Cloudflare Tunnel (`cloudflared`) terminates TLS at the edge; app serves plain HTTP on a local port. No in-container reverse proxy.
- **Email:** Resend (transactional)
- **Auth methods (v1):** email + password with verification, Google, Facebook

## App changes

- [x] Swap `adapter-auto` → `adapter-node` (`svelte.config.js`, `package.json`)
- [x] `Dockerfile` — multi-stage bun build; compile `better-sqlite3` native module; run as non-root `bun` user; entrypoint runs migrations then starts the server
- [x] `.dockerignore`
- [x] Entrypoint runs migrations against the volume DB before boot (`scripts/migrate.js`, programmatic migrator — no `drizzle-kit` at runtime)
- [x] Health check endpoint (`GET /healthz`, pings DB) + Docker `HEALTHCHECK`
- [ ] Structured request/error logging

## Configuration

- [x] `.env.example` documenting every required var
- [x] `docker-compose.yml` with named volume `dominatus-data` mounted at `/data`
- [ ] `BETTER_AUTH_SECRET` — production value generated via `openssl rand -base64 32`, injected by host/secret, not committed
- [ ] `ORIGIN` — public Cloudflare URL in prod (drives SvelteKit CSRF + Better Auth `baseURL`)
- [ ] `DATABASE_URL` — path on the mounted volume

## Email (Resend)

- [x] Add Resend SDK + `RESEND_API_KEY` (`src/lib/server/email.ts`; logs the link in dev when no key)
- [x] Better Auth `sendVerificationEmail` + `requireEmailVerification` + `sendOnSignUp` (signup shows a "check your inbox" state)
- [x] Better Auth `sendResetPassword` (password reset flow)
- [ ] Password-reset UI page (consume the `/reset-password?token=` link) — not built yet

## Social sign-in

- [x] Google provider (`socialProviders.google`) — needs `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- [x] Facebook provider (`socialProviders.facebook`) — needs `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET`
- [x] Social buttons on login + signup (`src/lib/components/SocialSignIn.svelte`)

## Auth UX gaps (not yet discussed — incomplete flows)

- [ ] `/reset-password` page to consume the reset token link (the email sends, but the link 404s)
- [ ] "Forgot password?" request form on the login page (calls `forgetPassword`, separate from the reset page)
- [ ] "Resend verification email" affordance for users who didn't click in time
- [ ] Sign-out control + an authenticated landing/account area (confirm where verified users land)
- [ ] Custom `+error.svelte` page (default SvelteKit error page is bare)

## Ingress

- [ ] `cloudflared` config / compose service pointed at the app port
- [ ] `trustedOrigins` set to the public URL (Better Auth rejects cross-origin requests otherwise)
- [ ] Confirm secure cookies behind the tunnel — cloudflared forwards plain HTTP to the app, so verify Better Auth marks cookies `Secure`/`SameSite` correctly (driven by the `https://` `ORIGIN`); set adapter-node `PROTOCOL_HEADER`/`HOST_HEADER` if request URLs come through as `http`

## Security & hardening (not yet discussed)

- [ ] Auth rate limiting / brute-force protection on sign-in, sign-up, and reset endpoints (Better Auth `rateLimit` config)
- [ ] Security headers — CSP, `X-Frame-Options`/frame-ancestors, HSTS (via `hooks.server` or SvelteKit `csp`); some may be set at the Cloudflare edge instead
- [ ] `BODY_SIZE_LIMIT` for adapter-node (defaults are generous)
- [ ] Decide secret-injection mechanism on the host (Docker secrets vs root-owned `.env` vs env from orchestrator)

## Observability (not yet discussed)

- [ ] Error tracking / alerting (e.g. Sentry) — structured logs alone won't page you
- [ ] External uptime monitoring hitting `/healthz`
- [ ] Log destination/retention — `docker logs` is ephemeral; decide whether to ship or rotate

## Ops

- [ ] Backups — periodic copy/snapshot of the SQLite volume (use `sqlite3 .backup`, not a raw file copy, because of WAL)
- [ ] Test the restore path, not just the backup
- [ ] Resource limits + restart policy in compose (restart policy set; mem/cpu limits not)
- [ ] CI — build the image, run `check` + `test` on PRs (note: vitest browser tests need Playwright browsers installed in CI)
- [ ] CD — push image to a registry + trigger redeploy on the host (and how the host pulls/restarts)

## Action items for you (external accounts — I can't do these)

- [ ] **Resend:** create account, verify a sending domain (add the SPF/DKIM/DMARC DNS records — needed for deliverability, not just sending), generate `RESEND_API_KEY`
- [ ] **Google Cloud Console:** OAuth 2.0 client; redirect URI `https://<your-domain>/api/auth/callback/google`
- [ ] **Meta for Developers:** app + Facebook Login; redirect URI `https://<your-domain>/api/auth/callback/facebook`
- [ ] **Cloudflare:** create the tunnel, get its token/credentials, map the hostname
