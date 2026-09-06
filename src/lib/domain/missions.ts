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

import { isCombatPatrol } from './battle-sizes';

/**
 * Primary missions for a standard matched-play game — each side runs its own (the picker and
 * storage are per-combatant). A Combat Patrol game draws from its own pack instead; see
 * `COMBAT_PATROL_PRIMARY_MISSIONS` and `primaryMissionsFor`.
 */
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

/**
 * Primary missions for a Combat Patrol game — a separate pack from the matched-play list above,
 * transcribed from the official Combat Patrol missions.
 *
 * Combat Patrol works differently: there is no shared pool a side picks from, but **one mission per
 * faction**, which an army simply has. So each entry pairs the faction with its mission, and the
 * picker labels the option with the faction to make a 24-entry list navigable. Only the `name` is
 * stored on the report, because Mission Analytics tallies by mission name and a warband has no
 * recorded faction to check against — the faction here is a label, not a constraint.
 *
 * The pack also has no secondaries: each card carries its own full scoring scheme, so a Combat
 * Patrol report scores a primary and nothing else (see `usesSecondaries` in `./battle-sizes`).
 *
 * Sorted by faction.
 */
export const COMBAT_PATROL_MISSIONS = [
	{ faction: 'Adeptus Astartes', name: 'Honour the Chapter' },
	{ faction: 'Adeptus Custodes', name: 'Defenders of the Golden Throne' },
	{ faction: 'Adeptus Mechanicus', name: 'Complete Annihilation' },
	{ faction: 'Adeptus Sororitas', name: 'On Holy Ground' },
	{ faction: 'Aeldari', name: 'Outflank and Encircle' },
	{ faction: 'Agents of the Imperium', name: 'Inquisitorial Sanction' },
	{ faction: 'Astra Militarum', name: 'For Cadia!' },
	{ faction: 'Black Templars', name: 'Uphold Your Vows' },
	{ faction: 'Blood Angels', name: 'Strike from on High' },
	{ faction: 'Dark Angels', name: 'Seize their Strongholds' },
	{ faction: 'Death Guard', name: 'Inexorable Conquest' },
	{ faction: 'Drukhari', name: 'Architects of Agony' },
	{ faction: "Emperor's Children", name: 'Grandiose Slaughter' },
	{ faction: 'Genestealer Cults', name: 'Slay the Oppressors' },
	{ faction: 'Grey Knights', name: 'Purification' },
	{ faction: 'Heretic Astartes', name: 'Shatter the Veil' },
	{ faction: 'Leagues of Votann', name: 'For the Kindred' },
	{ faction: 'Necrons', name: 'Dynastic Reclamation' },
	{ faction: 'Orks', name: "Duff 'em Up!" },
	{ faction: 'Space Wolves', name: 'Encircle and Destroy' },
	{ faction: "T'au Empire", name: 'Expansionary Campaign' },
	{ faction: 'Thousand Sons', name: 'Cult Ritual' },
	{ faction: 'Tyranids', name: 'Prepare the Way' },
	{ faction: 'World Eaters', name: 'Indiscriminate Butchery' }
] as const;

/** Just the mission names, for validation and for the pack selector below. */
export const COMBAT_PATROL_PRIMARY_MISSIONS: readonly string[] = COMBAT_PATROL_MISSIONS.map(
	(m) => m.name
);

/**
 * The primary-mission pack a report draws from, chosen by its battle size. The one place the
 * "which list?" question is answered, shared by the form's picker and the schema's validation so
 * the two can never offer and accept different sets.
 */
export const primaryMissionsFor = (battleSize: string | null | undefined): readonly string[] =>
	isCombatPatrol(battleSize) ? COMBAT_PATROL_PRIMARY_MISSIONS : PRIMARY_MISSIONS;

/** Is a name a canonical primary mission for a game fought at this battle size? */
export const isPrimaryMissionFor = (name: string, battleSize: string | null | undefined): boolean =>
	primaryMissionsFor(battleSize).includes(name);

/**
 * Picker options for the primary-mission field. The stored `value` is always the bare mission name;
 * only the `label` differs, naming the faction for Combat Patrol so the commander can find their
 * army's mission in a list that is otherwise 24 unfamiliar names.
 */
export const primaryMissionOptionsFor = (
	battleSize: string | null | undefined
): { value: string; label: string }[] =>
	isCombatPatrol(battleSize)
		? COMBAT_PATROL_MISSIONS.map((m) => ({ value: m.name, label: `${m.faction} · ${m.name}` }))
		: PRIMARY_MISSIONS.map((m) => ({ value: m, label: m }));

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
