# Deployment Checklist

Target: Docker container behind a Cloudflare Tunnel, SQLite on a mounted volume.

## Decisions

- **Adapter:** `@sveltejs/adapter-node` (standalone server in the container)
- **Runtime:** **Bun.** The app uses `bun:sqlite` (a Bun built-in), so it must run on the Bun
  runtime. The container (`oven/bun`) runs under Bun by default. **Local dev/build on Windows must
  force the Bun runtime:** `bun --bun run dev` / `bun --bun run build` — plain `bun run` executes
  via Node on Windows, and `bun:sqlite` then fails with `ERR_UNSUPPORTED_ESM_URL_SCHEME`.
- **Database:** SQLite via `bun:sqlite` + drizzle's `bun-sqlite` driver, on a mounted volume.
  (Switched from `better-sqlite3`: the Bun runtime refuses to load that native addon. `bun:sqlite`
  needs no native compile — drops the C toolchain from the image and the corporate-proxy TLS issue.)
- **Migrations:** programmatic `drizzle-orm/bun-sqlite/migrator` via `scripts/migrate.js` on
  container startup — `drizzle-kit` is dev-only, kept out of the deploy path
- **Ingress:** Cloudflare Tunnel (`cloudflared`) terminates TLS at the edge; app serves plain HTTP on a local port. No in-container reverse proxy.
- **Email:** Resend (transactional)
- **Auth methods (v1):** email + password with verification, Google, Facebook

## App changes

- [x] Swap `adapter-auto` → `adapter-node` (`svelte.config.js`, `package.json`)
- [x] DB driver: `better-sqlite3` → `bun:sqlite` (`src/lib/server/db`, `scripts/migrate.js`) so the app runs on the Bun runtime; `@types/bun` added + referenced in `app.d.ts` for `bun run check`
- [x] `Dockerfile` — multi-stage bun build (no native toolchain needed); `--ignore-scripts` on the dev install so the dev-only `@better-auth/cli`'s `better-sqlite3` dep doesn't try to compile; run as non-root `bun` user; entrypoint runs migrations then starts the server
- [x] **Container build verified end-to-end** (Podman, 2026-06-11): build → migrate → serve → `/healthz` 200 → sign-up DB write → verification-email dispatch all green. (Note: Podman ignores `HEALTHCHECK` unless built with `--format docker`; Docker honours it.)
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

## Required keys & secrets — future setup log

Everything the app reads from the environment, and the external account work needed to obtain
each. **None of these block local dev** — with no Resend key the verification/reset links print
to the server console, and the social buttons simply error until their credentials exist. Full
template lives in `.env.example`.

| Env var | Used by | How to obtain | Status |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | Better Auth session signing | `openssl rand -base64 32`; host-injected in prod, never committed | ⬜ prod value |
| `ORIGIN` | SvelteKit CSRF + Better Auth `baseURL` | Local `http://localhost:5173`; prod = Cloudflare Tunnel hostname | ⬜ prod value |
| `DATABASE_URL` | SQLite path | Local `local.db`; prod = mounted volume path | ⬜ prod value |
| `RESEND_API_KEY` | `src/lib/server/email.ts` | Resend → API Keys → create (`re_…`) | ⬜ not set |
| `EMAIL_FROM` | Sender address | Must be on a Resend-verified domain; falls back to sandbox `onboarding@resend.dev` | ⬜ not set |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `socialProviders.google` | Google Cloud Console → OAuth 2.0 client; redirect URI `https://<domain>/api/auth/callback/google` | ⬜ not set |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` | `socialProviders.facebook` | Meta for Developers → app + Facebook Login; redirect URI `https://<domain>/api/auth/callback/facebook` | ⬜ not set |

**Resend tiers:**
- **Tier 0 (now, no key):** links log to the dev console — full flow testable with zero setup.
- **Tier 1 (key only):** real emails, but the sandbox sender delivers *only* to your Resend signup address.
- **Tier 2 (verified domain):** add SPF + DKIM + DMARC DNS records, set `EMAIL_FROM` to an address on that domain → send to anyone.

**Social providers:** both also require the redirect URI above registered in the provider's
console; the `https://<domain>` must match the production `ORIGIN`. Local OAuth testing needs the
`http://localhost:5173/...` callback added too.

## Email (Resend)

- [x] Add Resend SDK + `RESEND_API_KEY` (`src/lib/server/email.ts`; logs the link in dev when no key)
- [x] Better Auth `sendVerificationEmail` + `requireEmailVerification` + `sendOnSignUp` (signup shows a "check your inbox" state)
- [x] Better Auth `sendResetPassword` (password reset flow)
- [x] Password-reset UI page (consume the `/reset-password?token=` link)
- [x] Verified end-to-end in dev (link logged to console with no `RESEND_API_KEY`)

## Social sign-in

- [x] Google provider (`socialProviders.google`) — needs `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- [x] Facebook provider (`socialProviders.facebook`) — needs `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET`
- [x] Social buttons with monochrome brand marks (`src/lib/components/SocialSignIn.svelte`), shown in the AccessGate terminal

## Auth UX gaps — DONE (2026-06-11, via `/impeccable craft`)

All five flows built in the "Campaign Cogitator" design system; `bun run check` + `bun run build` pass.

- [x] `/reset-password` page consuming the `?token=` link — new+confirm password, min-8, invalid/expired-token state, success → `/`
- [x] `/forgot-password` — dedicated route calling `requestPasswordReset` (note: Better Auth 1.4.x renamed `forgetPassword` → `requestPasswordReset`); neutral success (no account enumeration)
- [x] "Resend verification email" — folded into AccessGate's verify phase with a 30s cooldown; fires after enlist *and* on an unverified sign-in (403)
- [x] Sign-out control — already present in the `CampaignHub` header; logout now lands on `/` (was `/login`)
- [x] Custom `+error.svelte` — `// SIGNAL LOST` (404) / `// COGITATOR FAULT` (5xx), plain recovery
- [x] **Consolidation:** AccessGate at `/` is the single canonical anonymous terminal (social + forgot folded in). `/login` and `/signup` routes were **purged**; all 8 `redirect(302, '/login')` repointed to `/`. New shared `AuthTerminal.svelte` shell backs AccessGate, forgot-password, and reset-password.

## Ingress

> **Deferred to deploy time** (decided 2026-06-11). Hosting only happens at the end of
> development, and none of this can be *verified* until the container is actually running behind
> the tunnel (secure-cookie flag landing, headers forwarding). The config itself is production-only
> and has **no localhost-dev impact**: `PROTOCOL_HEADER`/`HOST_HEADER` are read by adapter-node in
> the built container (Vite dev never touches them); `trustedOrigins` derives from `ORIGIN` (=
> `localhost:5173` in dev); `useSecureCookies` must be **gated to prod** (`Secure` cookies aren't
> stored over `http://localhost`, so an ungated flag is the one thing that would break dev). The
> host already has a Cloudflare tunnel set up — point it at `http://localhost:3000` (the compose
> port). Pick this up as the first deploy-time task.

- [ ] `cloudflared` config / compose service pointed at the app port
- [ ] `trustedOrigins` set to the public URL (Better Auth rejects cross-origin requests otherwise)
- [ ] Confirm secure cookies behind the tunnel — cloudflared forwards plain HTTP to the app, so verify Better Auth marks cookies `Secure`/`SameSite` correctly (driven by the `https://` `ORIGIN`); set adapter-node `PROTOCOL_HEADER`/`HOST_HEADER` if request URLs come through as `http`

## Security & hardening

> **Deferred to deploy time** (decided 2026-06-11), alongside Ingress. Rate limiting is testable
> on localhost and protects the auth flows we shipped, so it's the natural *first* item to revisit
> when hardening resumes. CSP is the fiddly one — Vite's HMR injects inline scripts, so it needs
> separate dev/prod handling or it breaks the dev loop. `BODY_SIZE_LIMIT` is a prod env tweak.

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
