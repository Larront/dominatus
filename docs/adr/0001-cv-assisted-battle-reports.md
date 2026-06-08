# CV-assisted battle reports behind a stubbed analyzer seam

A battle report can be drafted from an optional uploaded image (a photo of a scoresheet /
board state): the server analyses it and pre-fills the report form, which the commander then
reviews, edits, and confirms.

The analysis lives behind a single server-side interface, `analyzeBattleReport(image) →
ReportDraft`, so the rest of the app depends on the interface, not the analyzer. The draft is
never authoritative: no battle report is committed without explicit human confirmation, and
manual entry with no image is always available — so a wrong or unavailable analysis degrades
to hand entry rather than blocking submission.

The analyzer will be a **dedicated computer-vision stack**, not a hosted vision-language
model — a deliberate choice to own the extraction pipeline rather than depend on a general
multimodal API. In the current scaffolding pass the analyzer is **stubbed** (returns an empty
draft); the real CV stack is a later vertical slice built against this interface.

## Status

accepted

## Considered options

- **Dedicated CV stack (chosen)** — own the extraction pipeline end to end.
- **Hosted vision-language model (e.g. Claude vision)** — faster to stand up, but rejected:
  we want a self-contained extraction stack rather than a dependency on a general multimodal
  API.

## Consequences

- The battle-report form must be built as a draft → review → confirm flow from the start, not
  a plain create form.
- Swapping the analyzer implementation, or moving analysis async (job + polling) later, is a
  change behind the `analyzeBattleReport` boundary and does not touch the form or schema.
