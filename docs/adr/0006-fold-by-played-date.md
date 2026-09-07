# The report log folds by played date, so a late report applies retroactively

A battle report records two different times: the day the game was **fought** (`played_on`) and the
instant the report was **filed** (`created_at`). Until now only the second existed, and it was what
the fold ordered by — so a game played on Monday and logged on Friday applied _after_ every report
filed Tuesday through Thursday.

The ordering is the part that matters. Control is an **ordered replay** (ADR 0002) whose clamps make
order matter, and the standings fold reads each report's shares _before_ and _after_ it applies to
score underdog and milestones — so folding a report in the wrong place doesn't merely mis-date it, it
changes who holds what and who scored what.

So:

- A report carries a **played date** — the calendar day the battle was fought, supplied on the form
  and defaulted to today.
- The **fold order is played date, then submit time, then id**. Played date leads; submit time
  settles two battles fought on the same day (the only order anyone knows within a day); the id is
  the final tiebreak so the order is total and deterministic.
- The **cycle stays a submit-time stamp** — the campaign's current cycle at the moment the report is
  filed, not a field on the form. A late report therefore carries the cycle it was _filed_ in even
  though it folds where it was _fought_. Accepted: the cycle is a coarse grouping for the Chronicle
  and the awards, the played date is the precise record, and asking for both would be two "when"
  questions on the form for one game.
- A late report is therefore **retroactive**: it inserts into the middle of the log, and every
  report after it on that world re-derives around it. Control and standings can change for games
  already played and already displayed.

## Status

accepted

## Considered options

- **Fold by played date; late reports are retroactive (chosen)** — the campaign's history is what
  actually happened at the table, so the log's order should be the order of play. Costs nothing at
  read time: control, standings and the Chronicle are already pure re-derivations of the ordered
  log (ADR 0002/0003), so a mid-log insert needs no new machinery — only the ordering changes.
- **Record the played date but keep folding by submit time** — rejected. It makes the played date
  decorative: the leaderboard would still be wrong for the games it mis-ordered, and two readers
  (the date on screen, the order in the fold) would disagree about the same log.
- **Freeze standings once seen; apply late reports going forward only** — rejected. It requires
  storing the standings to have something to freeze, which contradicts ADR 0003 (points are derived
  on read, never stored), and it makes the leaderboard depend on when someone happened to look.
- **Have the arbiter re-order the log by hand** — rejected. The fold already re-derives from the
  log; a manual ordering would be a second source of truth for the same thing.
- **Also make the cycle a form field, defaulted to the current cycle** — rejected. It adds a second
  "when" question to the form for no gain in the fold (the cycle orders nothing — `FOLD_ORDER` never
  reads it), it needs its own bounds to keep the Chronicle from drawing a divider per typo'd cycle,
  and it invites two answers to the same question to disagree. If a stamped cycle later proves wrong
  for a late report, the arbiter can already correct it on the amend path.

## Consequences

- **The leaderboard can rewrite history.** A report filed days late changes the control and points
  that follow it, including numbers players have already seen. This is accepted deliberately: the
  narrative record is the authority, not the order things were typed in. The Chronicle is what makes
  it legible — it runs in played order too, and an arbiter correction already appears there as an
  event (issue #6), so a swing has a visible cause.
- `FOLD_ORDER` stays the single declaration of the order, shared by control, standings and the
  Chronicle, so no reader can order the log differently. Adding the played date meant changing one
  constant.
- `recomputeWorldControl` already re-folds a world's **whole** log rather than stepping forward from
  the stored shares, so a mid-log insert is handled with no special case. Control is per-world, so a
  backdated report can only disturb its own world.
- The Chronicle orders battles by played date (with submit time as the same-day tiebreak) rather
  than by filing time, so a report's control-shift event sits next to the shares that produced it.
  Awards, musters and corrections still sort on their own real instants — the axis is "when it
  happened", and for a correction that is when the arbiter made it.
- A played date is a **calendar day, not an instant**, and is stored as a `YYYY-MM-DD` string. No
  anchor hour survives the date line: noon UTC on the 6th is already the 7th at UTC+13, which is
  where this campaign's players are. As text there is nothing to shift, and ISO dates sort
  chronologically, so the fold's ordering is a plain string sort. See `$lib/domain/played-date`.
- Existing reports were backfilled with their submit day, which is the only played date the app ever
  knew — so the migration leaves the fold order byte-for-byte unchanged and no control re-derives.
- A late report's **cycle stamp is the filing cycle**, so the Chronicle groups it under the cycle it
  was reported in while ordering it within that block by when it was fought. The two readings differ
  only for reports that cross a cycle boundary, and the arbiter can correct the stamp on the amend
  path, where the stored cycle round-trips through the form.
- The played date is validated as a real day at the form boundary and as "not in the future" at the
  submit action, which has a clock. The future check carries two days of slack: a commander in
  UTC+13 picking their own "today" is legitimately ahead of a server running on UTC.
