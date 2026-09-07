# Dominatus

A self-hosted tracker for custom Warhammer 40k narrative campaigns. Players follow a
planetary system on a top-down orbital map, log the battles they fight, and watch control
of each world shift over the course of the campaign.

## Language

**Campaign**:
A bounded narrative war that players take part in. Multiple campaigns can run concurrently,
and a player only sees the campaigns they belong to. The master container every other
domain object hangs off.
_Avoid_: Theatre, theatre of war (flavour, not the entity).

**Warband**:
A force that contends for control of worlds within a campaign. Commanded by exactly one
user. The thing that appears in the standings. ("Unclaimed" is not a warband — it is a
world's control state when no warband holds it.)
_Avoid_: Faction (the prototype's term for the same thing — retired to prevent confusion
with a 40k army allegiance).

**Join Code**:
The short random credential a commander enters to enlist in a campaign — a 5-character,
case-insensitive code from an unambiguous alphabet, distinct from the campaign's slug. Unique
per campaign, generated when founded, and regeneratable by the arbiter to revoke a leaked code.
The slug is for URLs; the join code is for joining.
_Avoid_: Code (unqualified — collides with the slug, which used to double as the join code).

**Commander**:
A user in the context of the warband(s) they command. A user may command several warbands
in one campaign, but each warband has only one commander.

**Arbiter**:
The single authority who runs a campaign — defines the map, approves reports, settles
disputes. Exactly one per campaign. An arbiter may also command warbands; the role is about
campaign authority, not warband command.
_Avoid_: Admin, organiser (use Arbiter); do not call them a Commander.

**Membership**:
The record that a given user belongs to a given campaign, carrying their role in it
(`arbiter` or `commander`). Distinct from commanding a warband — the role grants campaign
authority, while command is a property of each warband.

**World**:
A celestial body in a campaign's planetary system that warbands contend to control. The
central object of the map and the thing battles are fought over.
_Avoid_: Planet (reserve "planet" for the rendered visual of a world on the map, not the
entity).

**Archetype**:
A kind of world — its render recipe (which PixelPlanets layers, in which palette) paired with
a pool of fitting `type` labels and flavour (value/garrison/supply/description). The world
generator rolls an archetype to produce a world; the resulting `type` text and `render` recipe
are then independently editable by the arbiter. Most archetypes are recolours of the same few
ported layer shaders, so adding one is data, not new shader code.
_Avoid_: Render (the recipe is one part of an archetype, not the whole thing).

**Control**:
How much of a world each warband holds, stored as a share per warband. Everything else is
derived from those shares: the **owner** is the majority holder, a world is **contested**
when no warband holds a majority, and **unclaimed** when no warband holds any share.

**Replay**:
The ordered re-derivation of world control from the approved battle-report log: reports are
folded oldest-first, one at a time, each moving control by ±10% (ADR 0002). "Oldest" means
**played order** — the day each battle was fought, then the order same-day games were filed in
(ADR 0006) — not the order the reports were submitted. It is never a
stateless sum — the 0% floor and the 100% pool make order matter — so it is a pure function of
the ordered log. Both readers sit on the _same_ replay: world **Control** takes the final
per-world shares, and the points **Standings** read each report's shares _before_ and _after_
it applies (to score underdog and milestones). Streak and kingkiller are scored on top of the
replay, not part of it — they are points state, not control.
_Avoid_: Recompute (too generic — a replay is specifically the ordered fold over the log).

**Battle Report**:
The record a commander submits documenting a game fought over a world. Splits its combatants
across two sides — attacker and defender — each holding **one or two**. The sides need **not**
be balanced: 1v1, 2v2 and the uneven 1v2 / 2v1 are all real games, and control moves per
combatant, so an uneven result is well-defined. Records the outcome, scores, its **Battle Size**, its **Played Date**, an optional
narrative, and an optional image. The single source of a battle's record.
_Avoid_: Battle (the report is the record; there is no separate battle entity).

**Played Date**:
The calendar day a battle was **fought**, recorded on its report and distinct from when the report
was **filed**. The date the Replay orders by (ADR 0006), which is what makes a report submitted days
late apply where the battle happened rather than at the end of the log — and therefore what makes a
late report change control and standings retroactively. A calendar day, never an instant: it carries
no time of day and no time zone, and is stored as its own `YYYY-MM-DD` value. Two battles fought on
the same day are separated by the order their reports were filed, the only order known within a day.
_Avoid_: Date, timestamp, submitted-at (unqualified — the point of the term is the split between
fought and filed); "played at" (an instant, which this deliberately is not).

**Guest**:
A combatant on a battle report who is **not in the league** — a walk-in opponent, recorded by
name rather than as a Warband. A guest exists only on the report: they hold **no** world share
and never appear on the map or the leaderboard, because every fold drops non-warband
combatants (`foldCombatants`). The warband facing a guest scores the result **in full** and
still gains or loses ground — against the uncontested pool, since the guest has none to take.
A guest game still counts in a warband's Stat Block (it was a real game), and the guest's own
score still feeds Mission Analytics, which is keyed by mission rather than by warband. Every
report needs at least one real warband.
_Avoid_: Guest Warband (a guest is deliberately _not_ a warband — no row, no colour, no
standing).

**Battle Size**:
What kind of game a battle report records — **Combat Patrol**, or a points size off the ladder
(500 / 1000 / 1500 / 2000). One field, because it is one choice made at the table: you agree to
play a Combat Patrol game _or_ a points game, never both. Combat Patrol is 500 points' worth of
models but is deliberately **not** a synonym for `500` — it is a different game, with its own
pre-built rosters, its own **Mission** pack, and **no secondaries at all**. Those two consequences
are the only things that key off this field: which primary pack the picker offers, and whether the
side scores secondaries. It never touches **Control** or **Standings** — a win is a win at any
size. Stored as free text, like the missions, so rotating the ladder is data rather than a schema
migration; the field was once a free points number, and an off-ladder legacy value still loads,
still renders, and still survives an amend.
_Avoid_: Points size (that is one kind of battle size, not the field), Format (the report form
already uses "format" for the 1v1 / 2v2 shape of the sides).

**Mission**:
A scoring objective from the current edition's canonical mission set (Warhammer 40k). A
**Primary Mission** is the main objective a side plays to — **each side runs its own** — and a
**Secondary Mission** is one of the side's chosen extra objectives. There are **two primary
packs**, chosen by the report's **Battle Size**: the matched-play set, and Combat Patrol's own.
A Combat Patrol game has no secondaries, so the block is hidden on the form and refused by the
schema. The canonical lists are a code-level domain constant, not arbiter-editable: an edition's
set is fixed game data, so rotating packs is a code change, not a campaign setting. A battle report carries each side's
primary mission and its secondary scores; the picker (and, later, analytics) constrains entries
to the canonical set, while storage stays free text so a future pack is data, not a schema
migration.
_Avoid_: Task, Objective (unqualified — say "primary/secondary mission").

**Force Disposition**:
The broad objective category a side fields under (e.g. _Take and Hold_, _Reconnaissance_) —
distinct from its named primary mission, and like it, **each side declares its own**. A fixed
canonical list, the same code-level domain constant as Mission, surfaced as an optional picker
per side on the battle report. Unlike missions it is never on the scoresheet, so it is always
entered by hand, never OCR-matched.
_Avoid_: Deployment (the disposition is the objective category, not the table layout).

**Report Draft**:
The provisional set of battle-report fields the server derives from an uploaded image via
computer vision. A draft is only ever a starting point: the commander reviews, edits, and
confirms it, and no battle report is committed without that human confirmation. Uploading an
image is optional — a report can always be filled in by hand.

**Planetary Effect**:
A named narrative modifier (title + description) the arbiter can declare in play on a world —
e.g. a warp storm or toxic atmosphere. **Descriptive only**: the app displays effects but never
enforces them or folds them into control or standings, the same hands-off stance as the army-
size ladder. Each campaign owns a **pool** of effects (authored when founded, editable after),
and any world may currently carry zero or more of them. Attachment is mutable current state,
not a cycle-stamped history — the arbiter rotates which effects sit on which worlds over the
campaign (weekly, in the running group), and the app remembers only the present assignment.

**Cycle**:
A numbered phase of a campaign. The campaign tracks its current cycle, and each battle
report is stamped with it **at submit** — so a report filed after a cycle turns over carries the new
cycle, not the one it was fought in. Deliberate: the cycle is a coarse grouping for the Chronicle
and the awards, and the report's **Played Date** is what records when the battle actually happened
(ADR 0006). (How long a cycle lasts and what happens when one closes are deferred rules — nothing
maps a date to a cycle, so the stamp could not be derived from the played date anyway.)
_Avoid_: Turn.

**Standings** (the **Leaderboard**):
The campaign-wide points table ranking warbands. Deliberately **separate from control** (ADR
0002): control is the map, standings are the points. Most points are derived by folding battle
reports (win, draw, underdog, narrative, control milestones); painting is granted as Awards. A
pure function of the report log plus awards, recomputed on read (ADR 0003).
_Avoid_: Score (a battle report's VP is a "score"; the campaign tally is "standings"/"points").

**Worlds Held**:
The map legend's **spatial** tally — per warband, the count of worlds it outright owns (holds a
majority of), strongest first. A pure derivation over current Control, shown in the map's "Warband
Standings" legend. Deliberately **not** the **Standings**: that is the points Leaderboard folded
from the report log, this is just "who holds more planets right now". The two answer different
questions and are computed differently; keep their names apart in code (`worldsHeld` vs
`computeStandings`).
_Avoid_: Standings (those are the points; this is the planet count).

**Award**:
A discrete point grant the arbiter makes by hand, for things no battle report captures —
currently painting (a unit, a character/monster/vehicle, or a terrain/display piece). An award
logs only its **kind**; its point value is read from the campaign's Scoring Profile at compute
time, so editing the profile re-scores past awards alongside the derived points. Distinct from
the derived points only in that a human, not the report log, decides it happened.

**Scoring Category**:
One line of points a warband can earn — the derived ones folded from reports (win, draw,
underdog, narrative, control milestone, loss, win streak, kingkiller) and the awarded ones a
human grants (painting kinds). Each category has a point value; some carry a threshold too
(milestone its control step, win streak its run length). **Win streak** is a repeatable bounty
every Yth consecutive decisive win — a draw or loss resets the run. **Kingkiller** rewards
ending another warband's reigning streak (run ≥ the streak length, read before the battle), by
beating them _or_ drawing them; a draw between two kings pays both. Win streak and kingkiller
are the only categories whose value depends on the sequence of prior reports, not just the
report in hand.
_Avoid_: Task (reads as a 40k mission objective — collides with **Mission**, the in-game scoring
layer the battle report now captures).

**Scoring Profile**:
The per-campaign set of point values for every Scoring Category, set when the campaign is
founded and editable by the arbiter thereafter. Standings read the founding campaign's profile
rather than any global default, so two campaigns in the same install can score differently. A
category set to **0** is inert — it grants nothing and is hidden from commanders' standings
(see the standings rules). Because standings recompute on read, editing the profile re-scores
the whole campaign's history.
