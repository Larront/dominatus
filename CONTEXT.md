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

**Control**:
How much of a world each warband holds, stored as a share per warband. Everything else is
derived from those shares: the **owner** is the majority holder, a world is **contested**
when no warband holds a majority, and **unclaimed** when no warband holds any share.

**Battle Report**:
The record a commander submits documenting a game fought over a world. Splits its combatant
warbands across two sides — attacker and defender — each holding one or two warbands (1v1 or
2v2) — and records the outcome, scores, an optional narrative, and an optional image. The
single source of a battle's record.
_Avoid_: Battle (the report is the record; there is no separate battle entity).

**Report Draft**:
The provisional set of battle-report fields the server derives from an uploaded image via
computer vision. A draft is only ever a starting point: the commander reviews, edits, and
confirms it, and no battle report is committed without that human confirmation. Uploading an
image is optional — a report can always be filled in by hand.

**Cycle**:
A numbered phase of a campaign. The campaign tracks its current cycle, and each battle
report is stamped with the cycle it was fought in. (How long a cycle lasts and what happens
when one closes are deferred rules.)
_Avoid_: Turn.
