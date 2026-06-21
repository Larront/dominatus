/**
 * The current edition's canonical battle-report option sets — Warhammer 40,000 — covering the
 * primary missions, secondary missions, and force dispositions a side declares.
 *
 * These are a domain constant, not arbiter-editable: an edition's set is fixed game data, so
 * rotating to a new pack is a code change here, not a per-campaign setting. The battle-report
 * form sources its pickers from these lists, and the mission matcher
 * (`src/lib/server/analysis/match-missions.ts`) maps OCR'd labels onto the mission lists.
 *
 * Storage stays flexible — a combatant's primary/secondary/disposition are stored as free text
 * (ADR 0001) — so a future pack is a change to these arrays, never a schema migration. The
 * constraint to the canonical set lives at the picker and at analytics time, not in the column:
 * an old report carrying a retired name keeps it.
 */

/** Primary missions — each side runs its own (the picker and storage are per-combatant). */
export const PRIMARY_MISSIONS = [
	'Unstoppable Force',
	'Battlefield Dominance',
	'Secure Asset',
	'Reconnaissance Sweep',
	'Death Trap',
	'Meatgrinder',
	'Immovable Object',
	'Vital Link',
	'Triangulation',
	'Delaying Action',
	'Punishment',
	'Determined Acquisition',
	'Extract Relic',
	'Surveil the Foe',
	'Locate and Deny',
	'Consecrate',
	'Purge and Secure',
	'Vanguard Operation',
	'Gather Intel',
	'Outmaneuver',
	"Destroyer's Wrath",
	'Inescapable Dominion',
	'Sabotage',
	'Search and Scour',
	'Smoke and Mirrors'
] as const;

/**
 * Force dispositions — the broad objective type a side fields under (the deployment/primary
 * category, distinct from the named primary mission above). Each side declares its own. Not on
 * the scoresheet, so this is a manual picker only — never OCR-matched.
 */
export const FORCE_DISPOSITIONS = [
	'Take and Hold',
	'Disruption',
	'Purge the Foe',
	'Priority Assets',
	'Reconnaissance'
] as const;

/** Secondary missions — each side scores its own selection of these. */
export const SECONDARY_MISSIONS = [
	'A Grievous Blow',
	'A Tempting Target',
	'Assassination',
	'Beacon',
	'Behind Enemy Lines',
	'Bring It Down',
	'Burden Of Trust',
	'Centre Ground',
	'Cleanse',
	'Defend Stronghold',
	'Display Of Might',
	'Engage On All Fronts',
	'Forward Position',
	'No Prisoners',
	'Outflank',
	'Overwhelming Force',
	'Plunder',
	"Secure No Man's Land"
] as const;

export type PrimaryMission = (typeof PRIMARY_MISSIONS)[number];
export type SecondaryMission = (typeof SECONDARY_MISSIONS)[number];
export type ForceDisposition = (typeof FORCE_DISPOSITIONS)[number];

/** Is a name one of the current edition's canonical primary missions? */
export const isPrimaryMission = (name: string): name is PrimaryMission =>
	(PRIMARY_MISSIONS as readonly string[]).includes(name);

/** Is a name one of the current edition's canonical secondary missions? */
export const isSecondaryMission = (name: string): name is SecondaryMission =>
	(SECONDARY_MISSIONS as readonly string[]).includes(name);

/** Is a name one of the current edition's canonical force dispositions? */
export const isForceDisposition = (name: string): name is ForceDisposition =>
	(FORCE_DISPOSITIONS as readonly string[]).includes(name);
