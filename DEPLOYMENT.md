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
- [x] Structured request/error logging — pino; one JSON line per request with a per-request `requestId` (child logger on `locals.log`), `handleError` logs 500s with the `err` serializer; `pino-pretty` in dev; `LOG_LEVEL` env-driven. See `docs/OPERATIONS.md`.

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
| `ORIGIN` | SvelteKit CSRF + Better Auth `baseURL`/`trustedOrigins` + secure-cookie gating + adapter-node URLs | Local `http://localhost:5173`; **prod = `https://dominatus.larront.com`** | ✅ value chosen, set in server `.env` |
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

> **LIVE (2026-06-11): `https://dominatus.larront.com`.** Routed via the existing host-level
> `cloudflared`, configured through the **Cloudflare GUI** (Zero Trust → Tunnels → public hostname)
> rather than a config file — Service points at the app's host port (deployed via Dockge). The
> deploy runs the published GHCR image (CD part 1); the host port is set in Dockge, not committed.

- [x] `trustedOrigins` set to the public URL — `auth.ts` sets `trustedOrigins: [ORIGIN]` (dev = `localhost:5173`, prod = `dominatus.larront.com`)
- [x] Secure-cookie + URL config done on the app side — `useSecureCookies` gated on `ORIGIN.startsWith('https://')` (off for localhost dev, on in prod). `PROTOCOL_HEADER`/`HOST_HEADER` **not needed**: adapter-node uses `ORIGIN` to build request URLs, so they resolve as `https` behind the tunnel without proxy-header config.
- [x] cloudflared ingress rule + DNS route — done via the Cloudflare GUI; public DNS resolves to the edge and the tunnel reaches the app.
- [x] **Verified behind the live tunnel** (2026-06-11): `GET /healthz` → 200 through the edge, and `/` returns the app's own headers incl. `Strict-Transport-Security` — proving HSTS + `useSecureCookies` are active under the prod https `ORIGIN`. *(LAN note: a split-horizon DNS entry resolves the hostname to a local IP `192.168.50.103` from inside the network, so test from off-LAN or fix the local override; the public path is correct.)*

## Security & hardening

> **Mostly done (2026-06-11).** Rate limiting, security response headers, and `BODY_SIZE_LIMIT`
> are shipped and verified (details below). Remaining: CSP (deferred — fiddly with the app's
> Google Fonts + SvelteKit's nonce mode, best done live or at the Cloudflare edge) and the host
> secret-injection decision. All shipped items are gated so localhost dev is unaffected.

- [x] Auth rate limiting / brute-force protection — Better Auth `rateLimit` in `auth.ts`, per-IP `customRules` on `/sign-in/email` + `/sign-up/email` (5/60s), `/request-password-reset` + `/forget-password` + `/send-verification-email` (3/60s), `/reset-password` (5/60s). `enabled` left to Better Auth's default (on when `NODE_ENV=production`, which the container sets and `bun run dev`/vitest do not — dev loop and tests untouched); `RATE_LIMIT_ENABLED` env overrides ('true' = force on for a localhost test, 'false' = prod kill-switch). Memory-backed (single container; counters reset on restart). **Smoke-tested on localhost** (2026-06-11): 6th sign-in in the window returned `429`.
- [x] Security response headers — `handleSecurityHeaders` in `hooks.server.ts` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo off) on every response; `Strict-Transport-Security` is gated on the https `ORIGIN` (on in prod, off on localhost dev). **Verified on the prod build** (2026-06-11): all five present with https `ORIGIN`, HSTS correctly absent with http.
- [~] **CSP — deliberately deferred** (decided 2026-06-11). Not shipped blind: the app loads Google Fonts (`fonts.googleapis.com` CSS + `fonts.gstatic.com` files) so those hosts need allowlisting, and SvelteKit's nonce/hash CSP mode conflicts with SSR'd inline `style=` attributes — getting it right needs a per-route browser check (incl. the OAuth redirect) against the live app. Do it at deploy time (or set a baseline CSP at the Cloudflare edge). `hooks.server.ts` carries a note pointing here.
- [x] `BODY_SIZE_LIMIT` — set to `16M` in `docker-compose.yml` (adapter-node defaults to **512K**, which would silently reject uploads). Sits above the 12 MiB image cap (`MAX_IMAGE_BYTES`) plus multipart overhead. This was a latent prod bug — scoresheet uploads would have failed in the container.
- [x] Secret-injection mechanism — **decided: Dockge-managed stack `.env`** (2026-06-11). The host runs the stack via Dockge, which stores `.env` in the stack dir and feeds it to the container via compose `env_file`. `BETTER_AUTH_SECRET` etc. live only there, never in git. (Image is public but carries no secrets — they're all injected at runtime.)

## Observability

- [~] Error tracking / alerting (e.g. Sentry) — **deliberately deferred** (decided 2026-06-11). JSON logs to `docker logs` are an acceptable floor at this scale; the tradeoff accepted is no *push* alerting (you have to go look). `handleError` in `hooks.server.ts` is the single wiring point if a tracker (Sentry/GlitchTip) is added later.
- [ ] External uptime monitoring hitting `/healthz` — **decided: Uptime Kuma** as a separate compose stack on the same box (deploy-time). Same-box is acceptable here: host-down is covered by physical presence, and Kuma probing the *public* `https://<domain>/healthz` (through the tunnel) still catches tunnel/DNS/TLS/networking failures. Run as its own compose project with its own volume so an app `down -v` can't touch it; alert to Discord/Telegram/ntfy.
- [x] Log destination/retention — Docker `json-file` rotation (`max-size: 10m`, `max-file: 5`, ~50 MB/service) in `docker-compose.yml`. No external shipper yet, but the JSON format is parse-ready for one.

## Ops

- [x] Backups — `scripts/backup.js` takes a WAL-safe snapshot via `bun:sqlite`'s `VACUUM INTO` (no `sqlite3` binary needed, no raw file copy), integrity-checks it, and rotates to the newest `BACKUP_KEEP` (default 14) on the dedicated `dominatus-backups` volume. Also mirrors the scoresheet images dir (`<DATABASE_URL dir>/images`) into `/backups/images` — write-once files, copied only when new, so a restore brings back scoresheets too. **Manual only for now** (`db:backup` / `docker compose exec`) — scheduling (sidecar/cron) and an offsite copy are still deferred. See `docs/OPERATIONS.md`.
- [x] Test the restore path, not just the backup — `scripts/restore.js` (integrity-check → save `.pre-restore` → atomic swap → drop stale `-wal`/`-shm`, then copy the image mirror back); round-trip verified locally.
- [x] **Uploaded scoresheets persist on the data volume** — battle-report images are written to `<DATABASE_URL dir>/images` (i.e. `/data/images`), so the existing `dominatus-data` mount covers them; no new volume needed. Stored on submit as evidence for the confirmed report (ADR 0001), served via the campaign-gated `/campaigns/[slug]/report/image/[file]`. Cleaned up on report delete/replace. `BODY_SIZE_LIMIT` (below) must stay above the 12 MB image cap.
- [x] Resource limits + restart policy in compose — `restart: unless-stopped` (already set) plus `mem_limit: 1g` / `cpus: 2.0` in `docker-compose.yml`. **Starting points, not measured** — Tesseract OCR on `/analyze` is the memory driver, so don't lower `mem_limit` without checking OCR doesn't OOM; tune to the box after watching real usage.
- [x] CI — `.github/workflows/ci.yml`: two jobs on PR + push to `main`. `verify` runs `bun run check` + `bun run test` (installs Playwright chromium for the `client` vitest project per `vite.config.ts`); `image` builds the Docker image (no push) with GHA layer cache. Bun tracks the Dockerfile's rolling `oven/bun:1`. *Not yet exercised on GitHub — first PR will be the real test.*
- [~] CD — **part 1 done:** `.github/workflows/publish.yml` builds + pushes `ghcr.io/larront/dominatus` (semver + `:latest`) on `v*` tags via the built-in `GITHUB_TOKEN`. `docker-compose.yml` gained `image:` (pins via `IMAGE_TAG`, defaults `:latest`) so the host runs `docker compose pull && docker compose up -d`. **Remaining (part 2):** GHCR package starts **private** — make it public or give the host a `read:packages` token; and pick a redeploy trigger (watchtower / webhook / SSH-from-CI).

## Action items for you (external accounts — I can't do these)

- [ ] **Resend:** create account, verify a sending domain (add the SPF/DKIM/DMARC DNS records — needed for deliverability, not just sending), generate `RESEND_API_KEY`
- [ ] **Google Cloud Console:** OAuth 2.0 client; redirect URI `https://<your-domain>/api/auth/callback/google`
- [ ] **Meta for Developers:** app + Facebook Login; redirect URI `https://<your-domain>/api/auth/callback/facebook`
- [ ] **Cloudflare:** create the tunnel, get its token/credentials, map the hostname
