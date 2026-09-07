/**
 * The battle sizes a report can be fought at — the canonical picker behind the report form's
 * "Battle size" field.
 *
 * `Combat Patrol` sits in the same list as the points sizes rather than in a field of its own,
 * because that is the choice a commander actually makes at the table: you agree to play a Combat
 * Patrol game *or* a 500/1000/1500/2000-point one, never both. It is 500 points' worth of models,
 * but it is a different game — its own pre-built rosters and its own mission pack — so it is a
 * distinct entry, not a synonym for `500`.
 *
 * Two things key off this choice (see `$lib/domain/missions`):
 *   - which primary-mission pack the picker offers, and
 *   - whether the side scores secondaries at all (Combat Patrol does not).
 *
 * Stored as free text on the report, like the missions, so rotating the ladder is data rather than
 * a schema migration; the constraint to this list lives at the picker. A legacy report carrying an
 * off-ladder size (the field used to be a free number) keeps it and still renders.
 */

/** The Combat Patrol entry's stored value. Exported so callers never spell the string themselves. */
export const COMBAT_PATROL = 'combat-patrol';

/** Upper bound on the stored value — a safety ceiling for the free-text column, not a game rule. */
export const MAX_BATTLE_SIZE = 40;

export const BATTLE_SIZES = [
	{ value: COMBAT_PATROL, label: 'Combat Patrol' },
	{ value: '500', label: '500 pts' },
	{ value: '1000', label: '1000 pts' },
	{ value: '1500', label: '1500 pts' },
	{ value: '2000', label: '2000 pts' }
] as const;

export type BattleSize = (typeof BATTLE_SIZES)[number]['value'];

/** Is a value one of the canonical battle sizes? */
export const isBattleSize = (value: string): value is BattleSize =>
	BATTLE_SIZES.some((s) => s.value === value);

/**
 * Was this report a Combat Patrol game? The single question the mission pack and the secondaries
 * block both ask, so no caller compares against the sentinel string itself.
 */
export const isCombatPatrol = (battleSize: string | null | undefined): boolean =>
	battleSize === COMBAT_PATROL;

/**
 * Does this battle size score secondary missions? Combat Patrol's pack has no secondaries — a side
 * plays its primary and nothing else — so the form hides the block and the schema rejects any.
 */
export const usesSecondaries = (battleSize: string | null | undefined): boolean =>
	!isCombatPatrol(battleSize);

/**
 * How to render a stored battle size. Canonical values get their list label; an off-ladder legacy
 * number falls back to "<n> pts" so an old report still reads correctly rather than showing a bare
 * value. Null when nothing was recorded, so callers can skip the line entirely.
 */
export function battleSizeLabel(battleSize: string | null | undefined): string | null {
	if (!battleSize) return null;
	return BATTLE_SIZES.find((s) => s.value === battleSize)?.label ?? `${battleSize} pts`;
}
