/**
 * World archetypes + the campaign world generator (ADR 0005).
 *
 * An archetype is a *kind* of world: a render recipe key (resolved by the PixelPlanets
 * renderer) paired with pools of fitting `type` labels and flavour (value / garrison /
 * supply / description). The generator rolls archetypes into concrete worlds; the arbiter
 * then edits any field by hand. Pure and dependency-free so it runs identically on the
 * client (instant shuffle) and the server, and so it is unit-testable.
 *
 * Most archetypes are recolours of the same few ported layer shaders, so adding one is a
 * data entry here, not new shader code — the two exceptions (gas giant, asteroid) carry
 * their own ported recipes in `pixelplanet.ts` but are still just a key from here.
 */

/** The render recipe keys the PixelPlanets renderer knows how to draw a world as. */
export const RENDER_KEYS = [
	'ocean',
	'lava',
	'hive',
	'ice',
	'desert',
	'verdant',
	'death',
	'barren',
	'river',
	'gas',
	'asteroid'
] as const;

export type RenderKey = (typeof RENDER_KEYS)[number];

export interface Archetype {
	/** Render recipe key — what the planet looks like. */
	render: RenderKey;
	/** Short tag shown in the generator's archetype picker. */
	tag: string;
	/** `type` label variants, so two worlds of one archetype don't read identically. */
	typeLabels: string[];
	/** Strategic-value pool (world.value). */
	values: string[];
	/** Garrison pool (world.garrison). */
	garrisons: string[];
	/** Supply-state pool (world.supply). */
	supplies: string[];
	/** Description fragments — `{name}` is substituted with the rolled world name. */
	blurbs: string[];
}

/** A fully-rolled world, shaped to the founding form's per-world fields. */
export interface GeneratedWorld {
	name: string;
	type: string;
	render: RenderKey;
	value: string;
	garrison: string;
	supply: string;
	description: string;
}

// ── shared flavour pools ─────────────────────────────────────────────────────
// Strategic value is archetype-independent (any world can be Critical), so it lives once.
const VALUES = ['Critical', 'Decisive', 'Strategic', 'Vital', 'Moderate', 'Marginal', 'Contested'];
const SUPPLIES = ['Stable', 'Strained', 'Failing', 'Severed', 'Abundant', 'Rationed'];

// ── archetype registry ───────────────────────────────────────────────────────
export const ARCHETYPES: Archetype[] = [
	{
		render: 'ocean',
		tag: 'Ocean',
		typeLabels: ['Ocean World', 'Tidal World', 'Drowned World', 'Archipelago World'],
		values: VALUES,
		garrisons: ['Tide-Wardens', 'Abyssal Cohort', 'Reef Garrison', 'Contested'],
		supplies: SUPPLIES,
		blurbs: [
			'A drowned world of archipelago refineries harvesting promethium from the deep.',
			'Endless storm-seas swallow whole armies; {name} is won rig by flooded rig.',
			'Floating hab-platforms ride the swell — every landing is a contested tide.'
		]
	},
	{
		render: 'lava',
		tag: 'Forge',
		typeLabels: ['Forge World', 'Volcanic World', 'Molten World', 'Furnace World'],
		values: VALUES,
		garrisons: ['Cohort Theta', 'Magma-Legion', 'Forge Garrison', 'Skitarii Maniple'],
		supplies: SUPPLIES,
		blurbs: [
			'A planet-wide foundry chained to its star’s heat. Whoever holds {name} arms the war.',
			'Rivers of slag divide the battle-lines; {name} forges munitions for whoever rules it.',
			'Ash-choked skies over endless foundry-spires — the anvil of the campaign.'
		]
	},
	{
		render: 'hive',
		tag: 'Hive',
		typeLabels: ['Hive World', 'Cardinal Hive World', 'Spire World', 'Sink World'],
		values: VALUES,
		garrisons: ['PDF Levies', 'Spire Guard', 'Contested', 'Underhive Gangs'],
		supplies: SUPPLIES,
		blurbs: [
			'A hive-sprawl of eighty billion souls — the crown of the system.',
			'War grinds level by level through {name}’s stacked hab-blocks and spires.',
			'Manufactorum-cities packed to the sky; taking {name} means taking its people.'
		]
	},
	{
		render: 'ice',
		tag: 'Ice',
		typeLabels: ['Ice World', 'Frozen World', 'Glacial World', 'Rime World'],
		values: VALUES,
		garrisons: ['Frost Cohort', 'Glacier Wardens', 'Skeletal Garrison', 'Contested'],
		supplies: SUPPLIES,
		blurbs: [
			'A glacier-locked world where the cold kills faster than the guns.',
			'Buried promethium under kilometres of ice; {name} is fought for in whiteout.',
			'Cryo-vaults and frozen ruins — {name} keeps its dead and its secrets perfectly.'
		]
	},
	{
		render: 'desert',
		tag: 'Desert',
		typeLabels: ['Desert World', 'Arid World', 'Dust World', 'Ash-Waste World'],
		values: VALUES,
		garrisons: ['Dust Raiders', 'Sand Cohort', 'Nomad Levies', 'Contested'],
		supplies: SUPPLIES,
		blurbs: [
			'A sun-scorched waste where water is worth more than ammunition.',
			'Dune-seas swallow the dead; {name} is crossed in long, thirsty marches.',
			'Buried ruins under shifting sand — {name} hides more than it shows.'
		]
	},
	{
		render: 'verdant',
		tag: 'Verdant',
		typeLabels: ['Jungle World', 'Verdant World', 'Feral World', 'Garden World'],
		values: VALUES,
		garrisons: ['Catachan Levies', 'Green Cohort', 'Feral Auxilia', 'Contested'],
		supplies: SUPPLIES,
		blurbs: [
			'A choking green hell where the wildlife musters as readily as the enemy.',
			'Canopy kilometres deep swallows {name}’s battles whole — no front line holds.',
			'Overgrown ruins and rampant rot; {name} reclaims whatever army stops moving.'
		]
	},
	{
		render: 'death',
		tag: 'Death',
		typeLabels: ['Death World', 'Toxic World', 'Plague World', 'Blighted World'],
		values: VALUES,
		garrisons: ['Hazard Cohort', 'Quarantine Garrison', 'Plague Levies', 'Contested'],
		supplies: SUPPLIES,
		blurbs: [
			'A poisoned world where the air itself wages war on the living.',
			'Toxic blooms drift across the battlefields of {name}; rebreathers fail by the hour.',
			'Blighted and feverish — {name} rots every supply line that touches it.'
		]
	},
	{
		render: 'barren',
		tag: 'Barren',
		typeLabels: ['Dead World', 'Barren World', 'Airless Moon', 'Tomb World'],
		values: VALUES,
		garrisons: ['Skeleton Watch', 'Vacuum Cohort', 'Abandoned', 'Contested'],
		supplies: SUPPLIES,
		blurbs: [
			'An airless rock cratered by ages of war; {name} keeps nothing but the dead.',
			'Silent and lifeless — every breath on {name} is rationed from a tank.',
			'A pitted tomb-world of buried vaults, fought for in the dark and the cold.'
		]
	},
	{
		render: 'river',
		tag: 'Riverine',
		typeLabels: ['Riverine World', 'Marsh World', 'Delta World', 'Fenland World'],
		values: VALUES,
		garrisons: ['Delta Wardens', 'Marsh Cohort', 'Riverine Auxilia', 'Contested'],
		supplies: SUPPLIES,
		blurbs: [
			'A world veined with great rivers; {name} is taken bridgehead by bridgehead.',
			'Endless marsh and floodland bog down armour — {name} favours the patient.',
			'Silt-choked deltas hide the approaches; {name} drowns the careless.'
		]
	},
	{
		render: 'gas',
		tag: 'Gas Giant',
		typeLabels: ['Gas Giant', 'Storm World', 'Cloud World', 'Tempest Giant'],
		values: VALUES,
		garrisons: ['Cloud-City Watch', 'Skiff Squadrons', 'Floating Garrison', 'Contested'],
		supplies: SUPPLIES,
		blurbs: [
			'A banded storm-giant; war is waged from cloud-cities adrift in its upper deck.',
			'No ground at all — {name} is held by whoever rules its floating refineries.',
			'Crushing winds and endless storms; {name} is a prize measured in skyhooks.'
		]
	},
	{
		render: 'asteroid',
		tag: 'Asteroid',
		typeLabels: ['Asteroid Field', 'Shattered World', 'Belt Cluster', 'Debris Field'],
		values: VALUES,
		garrisons: ['Belt Miners', 'Rock-Cohort', 'Void Wardens', 'Contested'],
		supplies: SUPPLIES,
		blurbs: [
			'A drifting belt of shattered rock; {name} is mined, fortified, and fought through.',
			'Tumbling debris and hollowed planetoids — {name} hides fleets in its shadow.',
			'A scatter of ore-rich rocks; holding {name} means holding the void lanes.'
		]
	}
];

const ARCHETYPE_BY_RENDER = new Map<RenderKey, Archetype>(ARCHETYPES.map((a) => [a.render, a]));

export function archetypeFor(render: string): Archetype {
	return ARCHETYPE_BY_RENDER.get(render as RenderKey) ?? ARCHETYPES[0];
}

// ── world-name generation ────────────────────────────────────────────────────
// Names are composed from an evocative core plus an optional epithet or numeral, so the
// pool of distinct results is far larger than the word list itself.
const NAME_CORES = [
	'Cindermaw', 'Veska', 'Coralis', 'Vorhast', 'Tessaron', 'Khoramun', 'Belasco', 'Ardent',
	'Halgaunt', 'Myrrek', 'Solenne', 'Drûl', 'Castellan', 'Verdis', 'Oran', 'Thelm', 'Khaldea',
	'Penumbra', 'Sabaoth', 'Ynnek', 'Morvath', 'Quill', 'Hesper', 'Talax', 'Ferrum', 'Galahad',
	'Numera', 'Ostara', 'Velkan', 'Dûrn', 'Maelis', 'Carrick', 'Vashti', 'Loren', 'Aphelion'
];
const NAME_SUFFIXES = [
	'Prime', 'Secundus', 'Tertius', 'Quartus', 'Majoris', 'Minoris', 'Ultima', 'Reach', 'Gate',
	'Anchorage', 'Extremis', 'Hold', 'Spire', 'Deep', 'Crossing', 'Veil', 'Rest', "'s End"
];
const ROMAN = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'IX', 'XII'];

// ── seeded RNG (mulberry32) ──────────────────────────────────────────────────
// A small, fast, well-distributed PRNG so a given seed reproduces a system exactly. The
// page reseeds on every shuffle; the generator itself stays pure.
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const pick = <T>(rng: () => number, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];

function rollName(rng: () => number, taken: Set<string>): string {
	for (let attempt = 0; attempt < 24; attempt++) {
		const core = pick(rng, NAME_CORES);
		const r = rng();
		const name =
			r < 0.4 ? core : r < 0.72 ? `${core} ${pick(rng, NAME_SUFFIXES)}` : `${core} ${pick(rng, ROMAN)}`;
		if (!taken.has(name)) {
			taken.add(name);
			return name;
		}
	}
	// Exhausted the easy space (tiny systems never will) — guarantee distinctness.
	let n = 2;
	let base = pick(rng, NAME_CORES);
	while (taken.has(`${base} ${ROMAN[n % ROMAN.length]}`)) n++;
	const name = `${base} ${ROMAN[n % ROMAN.length]}`;
	taken.add(name);
	return name;
}

function rollWorld(rng: () => number, taken: Set<string>): GeneratedWorld {
	const a = pick(rng, ARCHETYPES);
	const name = rollName(rng, taken);
	return {
		name,
		type: pick(rng, a.typeLabels),
		render: a.render,
		value: pick(rng, a.values),
		garrison: pick(rng, a.garrisons),
		supply: pick(rng, a.supplies),
		description: pick(rng, a.blurbs).replaceAll('{name}', name)
	};
}

export const MIN_WORLDS = 1;
export const MAX_WORLDS = 6;

/** Roll a whole system of `count` worlds (clamped 1–6) with distinct names, from `seed`. */
export function generateSystem(count: number, seed: number): GeneratedWorld[] {
	const n = Math.max(MIN_WORLDS, Math.min(MAX_WORLDS, Math.trunc(count) || MIN_WORLDS));
	const rng = mulberry32(seed);
	const taken = new Set<string>();
	return Array.from({ length: n }, () => rollWorld(rng, taken));
}

/** Roll one world from `seed`, avoiding any names in `taken` — for adding to an existing system. */
export function generateOne(seed: number, taken: string[] = []): GeneratedWorld {
	return rollWorld(mulberry32(seed), new Set(taken));
}
