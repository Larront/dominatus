# Production Smoke-Test Checklist

A manual run-through against the **live** app at **`https://dominatus.larront.com`** — to confirm a
release behaves correctly after a Dockge redeploy. (For local-dev testing with the Vorhast seed, see
`bun run db:seed`; this document is prod-only.)

> **State note:** prod has no demo data — there is **no** `db:seed` in the production image (the
> Dockerfile ships only `migrate.js`, `backup.js`, `restore.js`). You build all test state through
> the real flows: register accounts, create a campaign, join by code, submit reports. That's the
> point — it exercises the genuine paths a user hits.

Tick boxes are throwaway; walk it top to bottom. All steps run in a browser against the public
HTTPS origin unless a command block says otherwise.

---

## 0. Reset the production database

Run a reset **at the start** of the session for a clean slate, and **again whenever** test state
gets messy. Commands run on the host via the **Dockge stack terminal** (or SSH into the box) from
the stack directory.

> Prod is currently empty (fresh since launch), so no backup is required. If that ever changes,
> snapshot first: `docker compose exec app bun scripts/backup.js` (writes to `/data/dominatus/backups`
> — see `docs/OPERATIONS.md`).
>
> Data and backups are **host bind mounts** (`/data/dominatus/data`, `/data/dominatus/backups`), so
> `docker compose down -v` does **not** wipe them — reset by clearing the files directly.

**Via the host path (simplest — the dirs are right there):**

```sh
docker compose stop app
sudo rm -f  /data/dominatus/data/local.db*
sudo rm -rf /data/dominatus/data/images/*
docker compose up -d app          # entrypoint runs migrate.js → fresh empty schema
```

**Via a one-off container (if you don't have host shell access, only Dockge's terminal):**

```sh
docker compose stop app
docker compose run --rm --entrypoint sh app -c 'rm -f /data/local.db* && rm -rf /data/images/*'
docker compose up -d app
```

Confirm the reset took:

- [x] `curl https://dominatus.larront.com/healthz` → **200** (DB ping OK on the new empty DB)
- [x] `/` loads the splash page; no campaigns exist yet for any account

---

## 1. Deploy sanity

- [x] Dockge is running the intended tag (`ghcr.io/larront/dominatus:0.3.0` or `:latest`)
- [x] `GET /healthz` → 200 through the tunnel
- [x] `docker compose logs app` (or Dockge logs) — clean boot, migrations applied, no errors
- [x] Response headers on `/` include `Strict-Transport-Security` (proves https `ORIGIN` is active)

---

## 2. Anonymous landing & routing

- [x] `/` signed out → **Splash** page: WebGL planet on the orbital ring, tracking contact,
      staggered entrance animation, "Sign in" CTA
- [x] OS "reduce motion" on → entrance animation suppressed, page still usable
- [x] "Sign in" CTA → `/enter`
- [x] Gated route signed out (`/campaigns/anything`, `/account`) → redirects to `/enter`
- [x] Bad URL → custom **404 `// SIGNAL LOST`** page, recovery link works

---

## 3. Auth — email + password (real email via Resend)

- [x] `/enter` shows the AccessGate terminal (sign-in + enlist + "Continue with Google")
- [x] **Enlist** a new account → "check your inbox" verify state
- [x] Verification **email arrives** from `noreply@send.larront.com`; link verifies the account
- [x] **Resend verification** button works and respects the 30s cooldown
- [x] Sign in **before** verifying → blocked (403), offered the resend path
- [x] Sign in once verified → lands on `/` → **CampaignHub**
- [x] Wrong password → clear error, no account-enumeration leak
- [x] **Sign out** (CampaignHub header) → back to `/` (splash)
- [x] Session **survives a full page reload** (the `Secure` cookie persists under the real domain)

### Password reset

- [x] `/forgot-password` → submit → neutral success (no enumeration)
- [x] Reset **email arrives**; link → `/reset-password?token=…`
- [x] Min-8 enforced; mismatch caught; invalid/expired token → handled state
- [x] Reset succeeds → sign in with the new password

### Google OAuth

- [x] "Continue with Google" → Google consent screen
- [x] Approving returns via `…/api/auth/callback/google` → signed in, lands on `/`
- [x] A brand-new Google identity creates a user; signing out and back in reuses it

> Tip: register **two** accounts here (one email+password, one Google) — you need a second account
> for the join-by-code and arbiter-transfer checks below.

---

## 4. Campaign lifecycle (built from scratch)

- [x] Fresh account's **CampaignHub** is empty with a clear create/join affordance
- [x] **Create campaign** (`/campaigns/new`) — founding flow completes; you land on the new map
      as **arbiter**; note the generated join code
- [x] Map renders the founded worlds with their renders (lava/hive/ocean) and uncontested control
- [x] **Join by code** — your _second_ account joins with the code → becomes a **commander**
      (not arbiter)
- [x] **Standings** page loads (empty until reports exist)
- [x] **Rules** page renders
- [x] **Campaign account** page (`/campaigns/[slug]/account`) — per-campaign profile loads

---

## 5. Battle reports + scoresheet OCR

Have `docs/samples/scoresheet.png` on the testing device (download from the repo).

- [x] `/campaigns/[slug]/report` — form defaults to the current cycle, outcome unset
- [x] Submit a valid report (world + both warbands + outcome) → success message; **control updates**
      on the map and standings re-fold
- [x] Validation: same warband both sides / missing world → rejected with a clear error
- [x] **Scoresheet upload** — attach the sample, submit → image saved, viewable via the
      campaign-gated image route
- [x] **OCR `/analyze`** — run the sample through the analyze step → Tesseract returns parsed fields.
      Watch `docker stats` / logs: this is the memory driver, must not OOM under `mem_limit: 1g`
- [x] A realistic scoresheet photo near the **12 MB cap** still uploads (confirms `BODY_SIZE_LIMIT=16M`
      — the adapter-node 512K default would otherwise silently reject it)

---

## 6. Arbiter admin panel (`/campaigns/[slug]/admin`)

Signed in as the campaign's arbiter (the account that created it):

- [x] The **commander** account hitting `/admin` → **403** ("Only the arbiter can manage this campaign")
- [x] **Save details** (name/subtitle/cycle) → persists
- [ ] **Scoring profile** edit → "Standings re-scored"; standings change accordingly
- [x] **Regenerate join code** → new code works, old code no longer joins
- [x] **Edit a world** → fields persist on the map
- [x] **Planetary effects** — create, edit, attach to a world, detach, delete from pool
- [x] **Reverse a report** → "Report reversed"; its scoresheet image is deleted; control re-folds
- [x] **Transfer arbiter role** to the commander account → caller drops to commander and is
      redirected to the campaign; the new arbiter can open `/admin`, the old one now gets 403

---

## 7. Account

- [ ] `/account` loads the global profile; edits persist
- [ ] Email shown matches the signed-in user

---

## 8. Mobile / responsive (real devices over HTTPS)

Test on at least one real **iOS Safari** and one **Android Chrome** against the live URL, plus
DevTools emulation for spread. Viewports: iPhone SE (375px), iPhone 14 Pro (393px), small Android
(360px), tablet (768px). Check **portrait and landscape**.

- [x] **Splash `/`** — planet hero scales, no horizontal scroll, CTA thumb-reachable
- [x] **`/enter`** — terminal fits; on-screen keyboard doesn't cover the active input; Google button
      and tabs are tappable (≥44px targets)
- [ ] **CampaignHub** — cards stack, nothing clipped
- [ ] **Campaign map** — WebGL world renders on the mobile GPU; readable at 360px; any pan/zoom works by touch
- [x] **Standings** — table scrolls/reflows, no off-screen overflow
- [x] **Report form** — every field reachable; the **camera / file picker opens** for the scoresheet
      (the key mobile path — commanders photograph sheets); OCR completes without timing out on a phone
- [x] **Admin panel** — long forms scroll; row-level edit/delete buttons tappable
- [x] **404 / 5xx** pages legible on a narrow screen
- [x] No element forces horizontal scroll (`document.body.scrollWidth` == viewport width)
- [x] **Session persists across reload** on mobile (secure cookie under the real domain)
- [x] **Google OAuth** completes on mobile (the redirect round-trip returns to the app correctly)

---

## 9. Security & hardening

- [x] **Rate limiting** — 6th sign-in attempt in a 60s window → **429** (on by default in prod;
      `NODE_ENV=production`). Recovers after the window
- [x] Reset / verification endpoints rate-limited (3/60s) — rapid repeats → 429
- [x] Security headers on every response: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
      `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo off)
- [x] `Strict-Transport-Security` present (https origin)
- [x] Session cookie is `Secure` + `HttpOnly` (DevTools → Application → Cookies)
- [x] No secrets leaked in page source or client bundles

---

## 10. After the run

- [ ] Capture any failures with repro steps (and the failing tag)
- [ ] Reset prod to empty for the next pass, or restore a snapshot (section 0)
- [ ] If the build is good, note the verified tag against the release
