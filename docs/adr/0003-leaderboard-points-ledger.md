# The leaderboard is a points ledger, separate from world control

ADR 0002 keeps **world control** (the map) deliberately separate from the **leaderboard** (the
points table): only games move control, while the leaderboard is a distinct ledger that does
not feed control. This ADR fixes how that ledger is scored and computed.

The leaderboard is **campaign-wide cumulative** — one running total per warband across the whole
campaign (each report and award is cycle-stamped, but v1 renders only the running total). Points
accrue per **warband**, not per user (a commander running two warbands scores them separately).

## Scoring

A **hybrid** model: most points are **derived** by folding the campaign's battle reports (the same
ordered replay control uses), and **painting** is granted as discrete **arbiter awards**.

Derived from reports (per report, per warband):

- **Win** — +3 to each warband on the winning side.
- **Draw** (`stalemate`) — +1 to every combatant warband.
- **Loss** — 0.
- **Underdog** (+1) — to a winning warband when **any warband it beat held a higher control share
  on that world, at battle time** (the share read **before** this report's fold is applied). Flat
  +1 per winning warband, regardless of how many bigger losers it beat. Measured per-world, not
  campaign-wide: it rewards taking a planet off a bigger local holder.
- **Narrative** (+1) — to **every combatant warband** in a report that carries a narrative
  (`narrative` non-empty). It rewards documenting the battle, so both sides earn it, not just the
  submitter.

Arbiter awards (discrete, granted by hand):

- **Paint a unit** — +1
- **Paint a character / monster / vehicle** — +2
- **Paint a terrain item / display base** — +1

Control milestones, derived during the same replay:

- **+1 per 20% control ever reached** on a world, **banked** — once a warband reaches 20/40/60/80/
  100% on a world it keeps that point even after losing ground. Computed as `floor(maxShare / 20)`
  per (world, warband), where `maxShare` is the highest share that warband held on that world at
  any point in the replay (tracked over the post-fold snapshots). Summed across worlds.

## Computation

Because **underdog** needs each combatant's share _before_ the battle and **milestones** need the
_max share ever reached_, the leaderboard is not a stateless sum of results — it is a fold that
runs the per-world control replay alongside the points tally, reusing `applyReport` from
`control-fold.ts`. Painting awards are then added on top. Like control, the result is a pure
function of the ordered report log plus the award set, so it is recomputed on read (no stored
standings) and an arbiter report edit/deletion re-derives it.

## Status

accepted — but **superseded in part by ADR 0004**: point values are no longer a global constant
(they are a per-campaign editable Scoring Profile), and painting awards no longer snapshot their
points (they derive from the profile by kind, so they re-score with it). The hybrid model, the
fold-on-read computation, and the category definitions below otherwise stand.

## Considered options

- **Hybrid derived + arbiter awards (chosen)** — objective points (win/draw/underdog/milestone/
  narrative) fall straight out of the report log; only painting, which no report field captures,
  needs a human. Keeps the bulk auditable while allowing the one subjective category.
- **Fully derived from reports** — rejected: painting has no report field, and bolting one on
  would conflate "what happened in the game" with "what the arbiter rewarded out of game".
- **Fully manual ledger** — rejected: throws away the fact that win/draw/underdog/milestone are
  already implied by the reports the app stores, forcing hand entry of derivable points.

## Consequences

- A `painting_award` table records each grant (campaign, warband, cycle, kind, optional note,
  granting arbiter). It logs only the **kind** — its point value is read live from the campaign's
  Scoring Profile at compute time (per ADR 0004), so editing the profile re-scores past awards
  alongside the derived points. (This reverses the snapshot-at-grant approach first considered
  here.)
- `$lib/domain/standings.ts` holds the pure fold (`computeStandings(reports, awards)`), tested in
  isolation like `control-fold.ts`. The server resolves reports/awards and the route renders the
  table; the arbiter award panel is gated to the `arbiter` role.
- The map's "Warband Standings" legend (count of worlds outright owned) is a **separate, spatial**
  metric and is left unchanged — the points ledger lives on its own `/standings` route.
- Per-cycle tabulation and any cycle-close scoring remain deferred (CONTEXT.md).
