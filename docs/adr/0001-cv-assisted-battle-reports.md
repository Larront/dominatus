# OCR-drafted battle reports behind an analyzer seam

A battle report can be drafted from an uploaded scoresheet image: the server reads it and
pre-fills the report form, which the commander then reviews, edits, and confirms.

The reading lives behind a single server-side interface, `analyzeBattleReport(image) →
ReportDraft`, so the rest of the app depends on the interface, not the analyzer. The draft is
never authoritative: no battle report is committed without explicit human confirmation, and
manual entry with no image is always available — so a wrong or unavailable reading degrades
to hand entry rather than blocking submission.

## What the image is

Players keep score in the **Tabletop Battles** app, which exports a standardised end-of-match
scoresheet (a known, regular layout: a header with both players, factions and the final score,
then a per-player block of primary / secondary / battle-ready rows). Because the layout is
fixed and we only ever receive pixels (the app is third-party — we can't change its output),
reading it is **OCR over a known template**, not general computer vision.

The analyzer reconstructs structure from the words' geometry (rows by vertical band, the
trailing `NN/NN` as a row's total, grid cells as the numbers between label and total), working
in fractions of page width so it's independent of the export's resolution. It runs in two passes:

1. **Full page, default config** — reads names, mission labels, and the `NN/NN` primary /
   battle-ready totals reliably.
2. **Per-row, digit-only** — the shaded single-digit secondary cells OCR poorly in the full
   pass, so each secondary row's grid region is re-OCR'd on its own with a digit whitelist and
   single-line mode. Isolating one line of cells at a time reads them far better (on the sample
   sheet this took the secondary grid from 18/22 cells correct to 22/22, both block totals
   matching). A row whose re-OCR fails keeps its full-pass value.

Implementation: `tesseract.js`, run server-side and lazily loaded on first use. The OCR engine is
self-contained — we deliberately do **not** depend on a hosted vision-language model.

## What the sheet does and doesn't carry

The scoresheet names each **player** and **faction** and gives the score breakdown. It does
**not** record which side attacked, which world was fought over, or the game's points size.
So the analyzer fills only what it can see, and these consequences follow:

- **Identities are matched, not invented.** The sheet names a player and faction; a warband is
  commanded by a user and has its own name. A separate matching step (it needs campaign context
  the analyzer doesn't have) resolves the player name against the commander's name and the
  faction against the warband name/tag, leaving a warband blank when unsure for the commander to
  pick.
- **Sides, world, and outcome are always entered by hand.** The form seats the first player as
  attacker and the second as defender purely as a starting point; the commander assigns the real
  sides, the world, and the outcome.
- **Secondary scores are the least certain field.** Primary and battle-ready totals read cleanly
  from their `NN/NN`; per-secondary points are summed from the sparse per-round grid, which OCRs
  noisily — so they are surfaced for the commander to correct, and capped at the form's six.

## Status

accepted — amended (superseding the original "dedicated computer-vision stack" framing: the
standardised, fixed-layout export makes template OCR the right tool; a bespoke CV stack would be
over-built for the problem).

## Considered options

- **OCR a known template with tesseract.js (chosen)** — self-contained, matched to a fixed
  third-party layout.
- **Bespoke computer-vision stack** — the original plan; rejected as over-built now that the
  input is a standardised scoresheet rather than arbitrary board photos.
- **Hosted vision-language model (e.g. Claude vision)** — faster to stand up, but rejected: we
  want a self-contained reader, not a dependency on a general multimodal API.

## Consequences

- The battle-report form is a draft → review → confirm flow, not a plain create form.
- `ReportDraft` mirrors the form's score breakdown and carries the detected player name/faction
  for matching; it deliberately omits world / side / outcome, which the sheet can't supply.
- The uploaded image seeds the draft in memory and is **not** persisted yet. The
  `battle_report.image_path` column exists for later; wiring it would thread a stored path
  through the form/schema and is a separate change behind this seam.
- Swapping the analyzer implementation, or moving analysis async (job + polling) later, is a
  change behind the `analyzeBattleReport` boundary and does not touch the form or schema.
