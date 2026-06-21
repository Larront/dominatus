/**
 * The current edition's canonical mission lists — Warhammer 40,000 10th edition, the
 * Pariah Nexus mission pack.
 *
 * These are a domain constant, not arbiter-editable: an edition's mission set is fixed game
 * data, so rotating to a new pack is a code change here, not a per-campaign setting. The
 * battle-report form sources its primary picker and secondary picker from these lists, and the
 * mission matcher (`src/lib/server/analysis/match-missions.ts`) maps OCR'd labels onto them.
 *
 * Storage stays flexible — a report's secondaries are still a free `{ name, victoryPoints }[]`
 * (ADR 0001) — so a future pack is a change to these arrays, never a schema migration. The
 * constraint to the canonical set lives at the picker and at analytics time, not in the column:
 * an old report carrying a retired mission name keeps it.
 */

/** Primary missions — each side runs its own (the picker and storage are per-combatant). */
export const PRIMARY_MISSIONS = [
	'Take and Hold',
	'Purge the Foe',
	'The Ritual',
	'Scorched Earth',
	'Linchpin',
	'Terraform',
	'Burden of Trust',
	'Supply Drop'
] as const;

/** Secondary missions — each side scores its own selection of these. */
export const SECONDARY_MISSIONS = [
	'Engage on All Fronts',
	'Bring It Down',
	'Assassination',
	'Behind Enemy Lines',
	'Cleanse',
	'Storm Hostile Objective',
	'Area Denial',
	'No Prisoners',
	'Defend Stronghold',
	'Overwhelming Force',
	'Recover Assets',
	'Sabotage',
	'Cull the Horde',
	'Containment',
	'Marked for Death',
	'Extend Battle Lines',
	'A Tempting Target',
	'Capture Enemy Outpost',
	'Establish Locus'
] as const;

export type PrimaryMission = (typeof PRIMARY_MISSIONS)[number];
export type SecondaryMission = (typeof SECONDARY_MISSIONS)[number];

/** Is a name one of the current edition's canonical primary missions? */
export const isPrimaryMission = (name: string): name is PrimaryMission =>
	(PRIMARY_MISSIONS as readonly string[]).includes(name);

/** Is a name one of the current edition's canonical secondary missions? */
export const isSecondaryMission = (name: string): name is SecondaryMission =>
	(SECONDARY_MISSIONS as readonly string[]).includes(name);
