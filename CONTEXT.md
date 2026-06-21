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
folded oldest-first, one at a time, each moving control by ±10% (ADR 0002). It is never a
stateless sum — the 0% floor and the 100% pool make order matter — so it is a pure function of
the ordered log. Both readers sit on the _same_ replay: world **Control** takes the final
per-world shares, and the points **Standings** read each report's shares _before_ and _after_
it applies (to score underdog and milestones). Streak and kingkiller are scored on top of the
replay, not part of it — they are points state, not control.
_Avoid_: Recompute (too generic — a replay is specifically the ordered fold over the log).

**Battle Report**:
The record a commander submits documenting a game fought over a world. Splits its combatant
warbands across two sides — attacker and defender — each holding one or two warbands (1v1 or
2v2) — and records the outcome, scores, an optional narrative, and an optional image. The
single source of a battle's record.
_Avoid_: Battle (the report is the record; there is no separate battle entity).

**Mission**:
A scoring objective from the current edition's canonical mission set (Warhammer 40k 10th
edition, the Pariah Nexus pack). A **Primary Mission** is the main objective a side plays
to — **each side runs its own** — and a **Secondary Mission** is one of the side's chosen
extra objectives. The canonical lists are a code-level domain constant, not arbiter-editable:
an edition's set is fixed game data, so rotating packs is a code change, not a campaign setting.
A battle report carries each side's primary mission and its secondary scores; the picker (and,
later, analytics) constrains entries to the canonical set, while storage stays free text so a
future pack is data, not a schema migration.
_Avoid_: Task, Objective (unqualified — say "primary/secondary mission").

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
report is stamped with the cycle it was fought in. (How long a cycle lasts and what happens
when one closes are deferred rules.)
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
