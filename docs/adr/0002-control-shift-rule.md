# Control shifts ±10% per game, as an ordered replay over approved reports

Control of a world is a fixed **100% pool**. Each warband holds an integer percentage (in
steps of 10), clamped to 0–100; the leftover — `100 − Σ(all warbands)` — is the world's
**uncontested** remainder. Every world starts fully uncontested (all warbands at 0%). This is
the Malvernis Sector group rule, and it is pure campaign-meta: it is independent of the 40k
edition being played (10th, 11th, …), which only governs the in-game layer the app does not
model.

A **decisive** battle report over a world moves control by 10 percentage points:

- The **loser** drops 10% (floored at 0 — a warband never goes negative).
- The **winner** rises 10%, drawn **from the loser first, then from the uncontested pool** —
  this is how a world is first claimed out of "uncontested". The gain is **capped so the
  world's total never exceeds 100% and the winner never exceeds 100%**. In normal mid-game
  play (loser ≥10%, pool not full) this is a clean 10% transfer loser→winner; the caps only
  bite at the edges.
- In a **2v2**, the rule applies **per warband**: each winning warband +10%, each losing
  warband −10% (so a winning side pulls up to 20% off the world).
- A **draw** (`stalemate` outcome) moves **no** control.

Control is **separate from the leaderboard**. The points table (win/draw, narrative log,
painting, control milestones, "+1 vs a larger holder") is a distinct, deferrable ledger and
does **not** feed world control. Only games move control.

Because of the clamps and the pool draw, the order of games matters once a warband hits 0% or
a world fills. Control is therefore **not** a stateless recompute from a bag of results: it is
a **chronological fold (replay) over the approved battle reports** for that world. This makes
control a pure function of the ordered report log, and makes reversing or rejecting a report a
replay from that point rather than a hand correction.

## Status

accepted

## Considered options

- **±10% ordered replay (chosen)** — matches how the group already runs Malvernis; the fold
  keeps derived control honest and auditable, and makes report reversal a replay.
- **Stateless recompute from result counts** — rejected: the 0% floor and 100% pool cap make
  the result order-dependent, so a bag-of-results recompute cannot reproduce the standings.
- **Margin/points-scaled shifts** — rejected: more rules surface and harder for the arbiter to
  eyeball; the group's rule is a flat ±10%.

## Consequences

- World control is computed by folding a world's approved reports in chronological order, not
  by summing shares. `control.ts` derivation (owner = >50%, contested = no majority,
  uncontested = the pool remainder) sits on top of the folded percentages.
- Storage records the per-(world, warband) percentage; replay reproduces it from the report
  log, so an arbiter reversal/rejection re-folds rather than patching a stored number.
- The battle-report submit action (currently a no-op TODO) must apply the fold step on the
  approved report and persist the new control snapshot.
- The army-size ladder (<20→500, ≥20→1000, ≥30→1500, ≥40→2000 pts) is an **advisory table-talk
  rule the app does not enforce**: it caps how large an army a player may bring, set by the
  **larger control share among the combatants** (yours or your opponent's) on the contested
  world. It is documented on the rules page only — report submission accepts any size and does
  not check it. Edition-neutral campaign-meta, so an 11th-edition points re-base is a charter
  change, not code.
