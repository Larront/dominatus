# Scoring is a per-campaign editable profile, and painting is derived not snapshotted

ADR 0003 fixed point values as a single edition-neutral module constant (`POINTS`) and recorded
painting awards as **snapshotted** — points frozen at grant time "so a later rule change does not
silently re-score history." Founding a campaign now lets the arbiter set point values themselves,
so we reverse both halves: every campaign owns a **Scoring Profile** — the point value for each
scoring category, plus the milestone control-step and the win-streak run length — stored as a
typed JSON column on the `campaign` row, seeded from the old constants and **editable** by the
arbiter thereafter. Painting awards now log only their **kind**; their points are read from the
profile at compute time, so painting re-scores alongside the derived categories. Standings already
recompute on read (ADR 0003), so editing a profile re-scores the campaign's whole history — the
intended behaviour for tuning a live campaign, mirroring how a report edit re-folds.

This supersedes ADR 0003's "Scoring" point values (now per-campaign config, not a code constant)
and the consequence that awards snapshot their points (now derived). The rest of 0003 — the hybrid
derived-plus-awarded model, the fold-on-read computation, the win/draw/underdog/narrative/milestone
definitions — still stands.

## What the profile adds beyond 0003

- **Loss** — a flat grant to every warband on the losing side of a decisive report (0003 fixed it
  at 0). Stateless.
- **Win streak** — a repeatable bounty of +X every Yth consecutive **decisive** win by a warband,
  campaign-wide. A draw **or** a loss resets the run to 0; the counter pays out each time it hits a
  multiple of Y. Sequential state — the only categories (with kingkiller) whose value depends on
  the order of prior reports, not the report in hand.
- **Kingkiller** — awarded for **ending** another warband's reigning streak (its run ≥ Y, read
  **before** this report applies, the same pre-battle timing underdog uses), by beating them _or_
  drawing them. A draw between two kings pays both sides.
- **Milestone** — its point value _and_ its control-% step are both profile knobs (0003 hard-coded
  the 20% step). The step governs scoring banding only; ADR 0002's ±10% control mechanic is
  unchanged.
- **Painting** — the unit / character / terrain values join the profile (editing them re-scores
  past awards, per the reversal above).

A category set to **0** is inert: it grants nothing and is hidden from commanders (its standings
column and rules-page row both disappear). The arbiter still sees zeroed categories so they can be
turned back on.

## Status

accepted — supersedes the scoring-constant and award-snapshot decisions of ADR 0003.

## Considered options

- **Per-campaign JSON profile (chosen)** — the profile is always read wholesale (the fold and rules
  page load all of it; no field is queried alone), and the category set is still evolving (loss,
  streak, and kingkiller were added after 0003). JSON makes a new category a schema-only change with
  no migration, with the founding form's zod schema as the single source of truth for its shape.
- **Per-category columns / a 1:1 scoring table** — rejected: every new category becomes a migration,
  for values never queried individually.
- **Keep the global constant** — rejected: it cannot express "this campaign scores losses, that one
  doesn't," which is the founding feature's whole point.

## Consequences

- `computeStandings` and the rules page take the campaign's profile as input instead of importing
  `POINTS`/`PAINTING_POINTS`; the constants survive only as the seed for a new campaign's profile.
- The `painting_award` snapshot column is dropped — points derive from the profile by `kind`.
- Editing a profile silently re-scores history. This is desired and consistent with report-edit
  re-folding, but it means standings are only ever as stable as the profile.
