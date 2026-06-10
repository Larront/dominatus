---
name: Dominatus
description: A grimdark campaign cogitator for tracking control of a 40k planetary war.
colors:
  void: '#07070a'
  panel: '#0b0b10'
  panel-2: '#101018'
  panel-solid: '#0a0a0f'
  border: '#2a2a33'
  ink: '#ece5d2'
  ink-dim: '#9b9276'
  ink-faint: '#5e5847'
  accent: '#46e08a'
  star: '#cfc6ad'
  state-contested: '#ffce54'
  state-attacker: '#ff8a6a'
  state-defender: '#6ad6ff'
typography:
  display:
    fontFamily: 'Chakra Petch, sans-serif'
    fontSize: '30px'
    fontWeight: 700
    lineHeight: 1
    letterSpacing: '0.01em'
  title:
    fontFamily: 'Chakra Petch, sans-serif'
    fontSize: '16px'
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: '0.01em'
  label:
    fontFamily: 'Chakra Petch, sans-serif'
    fontSize: '10px'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '0.14em'
  body:
    fontFamily: 'IBM Plex Mono, monospace'
    fontSize: '13px'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 'normal'
  prose:
    fontFamily: 'Spectral, Georgia, serif'
    fontSize: '15px'
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 'normal'
rounded:
  none: '0'
spacing:
  xs: '4px'
  sm: '8px'
  md: '14px'
  lg: '22px'
  xl: '26px'
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.void}'
    rounded: '{rounded.none}'
    typography: '{typography.label}'
    padding: '10px 14px'
  button-ghost:
    backgroundColor: '{colors.panel-2}'
    textColor: '{colors.ink-dim}'
    rounded: '{rounded.none}'
    typography: '{typography.label}'
    padding: '10px 14px'
  input:
    backgroundColor: '{colors.void}'
    textColor: '{colors.ink}'
    rounded: '{rounded.none}'
    typography: '{typography.body}'
    padding: '10px 12px'
  chip:
    backgroundColor: '{colors.panel-2}'
    textColor: '{colors.ink-dim}'
    rounded: '{rounded.none}'
    typography: '{typography.label}'
    padding: '9px 12px'
  panel:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.ink}'
    rounded: '{rounded.none}'
    padding: '20px 26px'
---

# Design System: Dominatus

## 1. Overview

**Creative North Star: "The Campaign Cogitator"**

Dominatus is a diegetic command console for surveying a war. You don't read it like a
dashboard; you operate it like authoritative kit. An orbital map of a planetary system —
shown on a tilted 3D ecliptic by default, flat top-down on demand — is the home screen and
the spatial truth of the campaign. Worlds drift on dashed elliptical rings, a pixel-art star
burns at the center, and intel panels slide over the void at the edges. The aesthetic is **grimdark, precise, atmospheric**: a near-black vacuum lit by a
single phosphor-green readout color, hard-cornered panels, and dense console typography.
Authority comes from precision and restraint, never from decoration or shouting.

The system carries one dark theme and one fixed emphasis color — **cogitator phosphor** (a cold
signals-terminal green) — burning against the constant void. The accent is not user-customizable;
its consistency is part of the identity. Pixel art is reserved exclusively for the
procedurally-rendered planets and star; everything else is clean militaristic chrome.

This system explicitly rejects: pixel fonts and CRT scanlines (tried and discarded as
costume — the chrome uses real type, pixel art stays on celestial bodies only); the generic
light-mode SaaS card-grid dashboard; literal Games Workshop pastiche (faction-neutral,
legally clean, the world is evoked not copied); and over-the-top costume grimdark
(no blood-spatter, blackletter, or skull kitsch). The grimdark is militaristic and
restrained, carried by palette, type, and atmosphere.

**Key Characteristics:**

- Map-first: the orbital system is home; panels slide over it, standings sit at corners.
- One dark surface, one fixed emphasis color (cogitator phosphor green). Not user-customizable.
- Hard corners everywhere (`border-radius: 0`) — the console signature.
- Console-density type: precise compact readouts over generous whitespace.
- Accent glow used sparingly as emitted light, never as a ghost-card shadow.
- Cogitator voice in chrome glyphs (`//`, `›`, `▸`); plain language on anything actionable.

## 2. Colors

A near-black vacuum lit by exactly one cold emphasis hue, with a warm bone ink that keeps the
darkness from tipping fully clinical.

### Primary

- **Cogitator Phosphor** (#46e08a): The single, fixed emphasis color and the soul of the
  system. A cold signals-terminal green. Primary actions, live indicators, active rings,
  section glyphs, the controlling-state glow. Not user-customizable — its consistency is the
  identity. Used on a small fraction of any screen; its rarity against the void is what gives
  it authority.

### Tertiary

State colors for battle outcomes and control, used as small chips/dots, never as surfaces.

- **Contested Gold** (#ffce54): A world no warband holds in majority; contested battle result.
- **Attacker Ember** (#ff8a6a): Attacker-side outcome in the battle log.
- **Defender Ice** (#6ad6ff): Defender-side outcome in the battle log.
- **Star Bone** (#cfc6ad): The central star's light; also the twinkle of background stars.

### Neutral

- **Void** (#07070a): The base background. The vacuum everything floats in.
- **Panel** (#0b0b10) / **Panel-2** (#101018) / **Panel Solid** (#0a0a0f): Tonal surface
  layering for bars, drawers, modals, and stat cells. Depth is tonal, not shadowed.
- **Hairline Border** (#2a2a33): Panel edges, dividers, dashed orbit rings. 1px only.
- **Bone Ink** (#ece5d2): Primary text. Warm off-white, never pure white.
- **Dim Ink** (#9b9276): Secondary text, labels, descriptions.
- **Faint Ink** (#5e5847): Tertiary text, placeholders, column headers, disabled.

### Named Rules

**The One Emphasis Rule.** Exactly one accent hue exists: cogitator phosphor (#46e08a). It is
fixed and not user-customizable. It lights primary actions, active state, and live indicators
— never body text, never a whole surface. Its scarcity against the void is the point.

**The Not-By-Color-Alone Rule.** Control state (owner / contested / unclaimed) and battle
outcome must never be conveyed by color alone — the per-warband faction colors make color-only
cues fragile. Always pair the color with a label, glyph, or share value.

## 3. Typography

**Display Font:** Chakra Petch (with sans-serif fallback) — squared, technical sci-fi.
**Prose Font:** Spectral (with Georgia, serif) — for long lore only (rules charter, world descriptions).
**Body / Data Font:** IBM Plex Mono (with monospace) — console readouts, forms, the battle log.

**Character:** A three-way pairing on a strong contrast axis: squared-geometric display
against humanist serif prose against a true monospace for data. Chakra Petch is the
nameplate and the label voice; IBM Plex Mono is the cogitator's console output; Spectral is
the one concession to readable long-form, used sparingly so it never softens the terminal feel.

### Hierarchy

- **Display** (Chakra Petch 700, 23–30px, 1.0): Drawer titles, modal titles, brand
  system name. The loudest type; still tightly tracked (0.01em), never above ~30px.
- **Title** (Chakra Petch 600, 16–20px, 1.1): Sub-headings, owner names, rule chapter heads.
- **Body / Data** (IBM Plex Mono 400, 13px, 1.5): The default. Battle log, stat values,
  control readouts, form input text. Compact and precise.
- **Prose** (Spectral 400, 15px, 1.6, max 65–75ch): Long lore only — the rules charter,
  multi-sentence world descriptions. Do not use for data or labels.
- **Label** (Chakra Petch 600, 9–11px, 0.14em, UPPERCASE): Section labels, button text,
  column headers, kickers, pills. The tracked-caps cogitator voice.

### Named Rules

**The Mono-Is-Data Rule.** IBM Plex Mono carries readouts, forms, and the battle log — never
paragraphs of lore. The moment text becomes prose to be _read_ rather than data to be
_scanned_, it switches to Spectral.

**The Caps-Are-Labels Rule.** Uppercase + tracking is reserved for labels ≤4 words, buttons,
and eyebrows. Never set a sentence or body copy in all caps.

## 4. Elevation

The system is **tonal, not shadowed**. Depth is built by stacking near-black surfaces
(void → panel → panel-2 → panel-solid) and 1px hairline borders, plus a single accent
top-bar that marks a panel's leading edge. Drop shadows exist only on overlays that genuinely
float (drawer, modal) and on planets for physical grounding. Everything else uses tonal layering.

Accent **glow** is a separate, deliberate material: it reads as emitted light on a dark
surface, not as a card shadow. It is allowed only on things that should appear to emit —
primary actions, live/active indicators, the star, focus rings — and always sparingly.

### Shadow Vocabulary

- **Overlay lift** (`box-shadow: -30px 0 80px rgba(0,0,0,0.7)` drawer; `0 40px 120px rgba(0,0,0,0.8)` modal): Anchors floating overlays above the map.
- **Planet grounding** (`drop-shadow(0 3px 8px rgba(0,0,0,0.6))`): Gives celestial bodies physical weight.
- **Accent glow** (`box-shadow: 0 0 16px var(--accent-soft)` primary button; `drop-shadow(0 0 30px var(--sun-glow))` star): Emitted-light cue. Sparing, accent-tinted only.
- **Focus glow** (`box-shadow: 0 0 0 1px var(--accent-mid), 0 0 14px var(--accent-soft)`): Input focus.

### Named Rules

**The Glow-Is-Light Rule.** A box-shadow may be soft and wide ONLY when it is accent-tinted
and reads as emitted light (buttons, indicators, the star). A soft _black_ drop shadow paired
with a 1px border on a resting card is forbidden — that is the ghost-card tell.

## 5. Components

### Buttons

- **Shape:** Hard corners (`border-radius: 0`). Never rounded, never pill.
- **Primary:** Solid accent fill, void text, label type (Chakra Petch 600/700 uppercase,
  0.09em), 10px 14px padding, a sparing accent glow (`0 0 16px var(--accent-soft)`).
- **Ghost / Secondary:** Panel-2 background, dim-ink text, 1px hairline border. Hover lifts
  text and border to accent and adds a faint inset accent ring + accent-soft fill.
- **Hover / Focus:** 0.12s color/background/border transition; `:active` nudges 1px down.
- **Icon:** Square 38px, centered glyph.

### Chips

- **Style:** Panel-2 background, 1px hairline border, label type, hard corners. A small
  faction/state dot may lead the label.
- **State:** Selected gets a colored border + inset ring + a 16% tint of its own color
  (`--chipcol`), text brightens to bone ink. Used for combatant/faction selection.

### Cards / Containers (Panels)

- **Corner Style:** Hard corners (`border-radius: 0`).
- **Background:** Panel over the void, often with `backdrop-filter: blur(6–8px)` where it
  overlaps the map.
- **Leading edge:** A 2px accent top-bar (`linear-gradient(90deg, accent, transparent 70%)`)
  marks the panel's top. Modals add 12px **corner ticks** at all four corners.
- **Shadow Strategy:** Tonal layering at rest; lift shadows only on floating overlays
  (drawer, modal). See Elevation.
- **Border:** 1px hairline (#2a2a33). Stronger accent-tinted border on floating overlays.
- **Internal Padding:** 20–26px (lg–xl).

### Inputs / Fields

- **Style:** Void background, 1px hairline border, hard corners, IBM Plex Mono text. Field
  labels are uppercase Chakra Petch prefixed with a `›` glyph.
- **Focus:** Border shifts to accent + a focus glow (1px accent ring + 14px accent-soft).
- **Placeholder:** Faint ink (#5e5847) — never lighter; keep it legible.
- **Select:** Native chevron replaced with an inline SVG; no rounded corners.

### Navigation / Top Command Bar

- **Style:** A horizontal command bar over the panel surface with `backdrop-filter: blur(6px)`
  and an accent-lit bottom hairline. Brand mark glows faintly in the accent.
- **Live cycle pill:** Uppercase label type with a blinking accent dot indicating the active
  campaign cycle.
- **Mobile:** Cycle pill hides ≤1000px; button text labels hide ≤720px (icons remain).

### The Orbital Map (Signature Component)

The home screen and the system's defining surface. A centered square stage holds the system on
a **tilted 3D ecliptic plane** (`transform-style: preserve-3d` + `rotateX`), so the orbit rings
read as **dashed ellipses** and the war has real depth. It carries: those orbit rings (the
active world's ring goes solid + accent-lit), a slow **conic scanner sweep** raking across the
plane, a central **pixel-art star** (WebGL, PixelPlanets star shader) with an accent glow, and
**pixel-art planets** (WebGL) orbiting on anchors. Worlds are **billboarded** — each is counter-
rotated against both its own revolution and the plane tilt so the pixel art stays square-on and
crisp. Each carries a tag below it — Chakra Petch name, plus an owner readout that pairs a
warband dot **and** a label (never colour alone). Worlds drift via long-period CSS revolution
(150–330s, outer = slower), parked at a deterministic resting angle; contested worlds are
flagged with a gold label, not just a hue. Planet canvases are `image-rendering: pixelated`.

**Dual view.** A corner toggle flips the plane between the dramatic **3D tilt** (~72°, the
default) and a flat **top-down** projection (0°), with a single eased `rotateX` transition;
the choice is remembered per device. Top-down is the legible fallback when many worlds crowd
the tilted band — the same map, two readings.

**Derived positions.** Worlds store no map coordinates. Each world's orbit radius, resting
angle, size, and drift period are derived deterministically from a stable hash of its id plus
its index (`$lib/domain/orbit`), so a world always sits in the same place. Rings are spaced
evenly inner→outer with the innermost clearing the star; angles use golden-angle spacing so
worlds never clump. (A future arbiter-placed layout can replace this single seam.)

### Standings Legend (Signature Component)

A collapsible panel anchored bottom-left over the map: accent top-bar, a `▸`-prefixed title,
column headers in faint tracked caps, and warband rows (color swatch + name + world count).
The commanding user's own warband is marked with a `YOU` label chip, not only an accent color.

## 6. Do's and Don'ts

### Do:

- **Do** keep the orbital map the center of gravity. Panels slide _over_ it; standings and
  intel sit at its corners. Never bury the map behind navigation.
- **Do** hold every panel, button, input, and chip at `border-radius: 0`. Hard corners are
  the console signature.
- **Do** keep the single fixed phosphor accent on a small fraction of the screen. Lean on the
  void and bone ink for everything else.
- **Do** pair every control/outcome color with a label, glyph, or share value (the
  Not-By-Color-Alone Rule), so the faction colors never carry meaning alone.
- **Do** use IBM Plex Mono for data and forms, Spectral for long lore, Chakra Petch for
  display and labels. Three families, on a hard contrast axis.
- **Do** use accent glow as emitted light, sparingly — primary actions, live indicators, the
  star, focus rings.
- **Do** give every animation (orbital drift, scanner sweep, blink/pulse, twinkle) a calm
  `prefers-reduced-motion` fallback.
- **Do** keep cogitator glyphs (`//` section labels, `›` field labels, `▸` bullets) as the
  voice — they're cheap, consistent terminal chrome.

### Don't:

- **Don't** use pixel fonts (Silkscreen, VT323) or CRT scanline / flicker overlays. Tried and
  rejected. Pixel art lives on planets and the star only; the chrome uses real type.
- **Don't** build a generic light-mode SaaS card-grid dashboard, the hero-metric template, or
  identical icon-heading-text card grids. This is a war console, not an analytics tool.
- **Don't** clone official Games Workshop UI or the eagle-and-skull house style. Faction-neutral,
  legally clean — the world is evoked, not copied.
- **Don't** ship costume-grimdark kitsch: no blood-spatter textures, gothic blackletter, or
  skull-everything. Restrained militaristic grimdark only.
- **Don't** pair a 1px border with a soft wide _black_ drop shadow on a resting card (the
  ghost-card tell). Glow is allowed only when accent-tinted and reads as light.
- **Don't** reintroduce the `feTurbulence` paper-grain overlay from the prototype. The subtle
  edge vignette carries the atmosphere alone.
- **Don't** set lore prose in IBM Plex Mono, or any sentence in all caps. Mono is for data;
  caps are for labels ≤4 words.
- **Don't** let in-fiction voice reach actionable copy. Buttons are verb + object ("Submit
  battle report"), errors and confirmations stay plainly readable.
