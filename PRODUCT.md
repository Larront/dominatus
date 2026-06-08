# Product

## Register

product

## Users

Warhammer 40k hobbyists running and playing **custom narrative campaigns** within a single
gaming circle. Two roles, both human players who know each other:

- **Arbiter** — the one person who runs a campaign: defines the planetary system, approves
  battle reports, settles disputes, advances the cycle. Also self-hosts the app.
- **Commander** — a player who commands one or more warbands, fights games over worlds, and
  submits battle reports documenting what happened.

Context of use: at home, on desktop or phone, in the quiet moments **around** games — planning
a move, logging a battle just played, checking who holds what before the next session. Not
used at the table mid-game. Sessions are short and purposeful: survey the map, open a world,
file a report, check standings.

Scale: built for one group first, but written so **another arbiter could clone and self-host**
their own campaign. Copy, setup, and empty states should make sense to a second group without
hand-holding; nothing should be hardcoded to one campaign's lore.

## Product Purpose

Dominatus tracks control of a planetary system as a narrative 40k campaign plays out. Players
fight games over **worlds**; each game becomes a **battle report**; control of every world is
derived from the per-warband shares those reports adjust. The top-down **orbital map** is the
home screen — worlds drift on their rings, each showing its owner, and the war's shape is
legible at a glance.

Why it exists: custom campaigns are normally tracked in spreadsheets and group chats that
lose the story. Dominatus makes the campaign a **place** you can look at — a system map that
changes as the war does — and keeps a durable, arbiter-approved record of every battle.

Success looks like: a commander can file a battle report in under a minute (optionally from a
photo of the score sheet via CV-assisted drafting), the arbiter trusts the standings without
reconciling anything by hand, and any member can open the map and immediately understand who
is winning and where the fighting is.

## Brand Personality

A **campaign cogitator**: a diegetic command console for surveying a war. Three words:
**grimdark, precise, atmospheric.** It should feel like authoritative kit you operate, not a
dashboard you read — map-centric, with intel and standings at the edges and panels that slide
over the system.

- **Voice:** flavour as chrome, plain where it counts. In-fiction texture lives in headings,
  section labels, and lore (cogitator readouts, Imperial-flavoured world classifications); the
  things a user must act on — buttons, form fields, errors, confirmations — stay plainly
  readable. Button labels are verb + object ("Submit battle report"), never in-fiction riddles.
- **Tone:** restrained and deliberate. Authority comes from precision and density, not from
  decoration or shouting.
- **Touchstone:** a blend of map-centric strategy command screens (a system to survey, panels
  over it, standings at the corners), diegetic sci-fi terminals (a single phosphor-green readout
  color, hard corners, scanned-data feel), and the data restraint of real mission-control consoles.
- **Emotional goal:** the quiet authority of being in command — looking down on your war and
  knowing exactly where you stand.

## Anti-references

- **No pixel fonts or CRT scanlines.** Explicitly tried and rejected in design: no
  Silkscreen / VT323, no scanline or screen-flicker overlays. Pixel art is reserved for the
  procedurally-rendered planets and star only; the chrome uses clean militaristic type
  (Chakra Petch + IBM Plex Mono).
- **No generic SaaS dashboard.** Not a light-mode card-grid analytics tool. This is a war
  console centered on a map, not a metrics dashboard. Avoid the hero-metric template and
  identical card grids.
- **No literal Games Workshop pastiche.** Faction-neutral and legally clean. Don't clone
  official 40k UI or the eagle-and-skull GW house style; the world is evoked, not copied.
- **No over-the-top costume grimdark.** No blood-spatter, gothic blackletter, or
  skull-everything kitsch. The grimdark is restrained and militaristic — carried by palette,
  type, and atmosphere, not horror props.

## Design Principles

- **The map is the product.** The orbital system is the home screen and the spatial truth of
  the campaign. Everything else slides over it or sits at its edges; never bury the map behind
  navigation.
- **Derived state, shown honestly.** Owner, contested, and unclaimed are computed from control
  shares, never stored opinions. Surface that derivation clearly (split bars, share counts) so
  the standing is self-evidently correct and the arbiter never reconciles by hand.
- **Flavour serves the task, never blocks it.** Atmosphere is welcome until it costs the user
  a click or a moment of confusion. When the two conflict, the action wins.
- **Command-console density.** Trust the user with information. Prefer precise, compact
  readouts over generous whitespace and oversized type; deliberate, not decorative.
- **Self-host clean.** Assume a second group will run this. No campaign's lore is hardcoded;
  empty and first-run states explain themselves without the original author present.

## Accessibility & Inclusion

Best-effort, not a compliance gate — this is a hobby tool for a known group. Pragmatic targets:

- Aim for readable contrast for the single phosphor-green accent and bone ink against the
  near-black void. Keep body text legible rather than chasing a strict ratio.
- Don't rely on color alone for control states (owner / contested / unclaimed) — the per-warband
  faction colors make color-only cues fragile. Pair them with labels or shape.
- Honor `prefers-reduced-motion`: the orbital drift, scanner sweep, and pulse animations need
  a calm fallback.
