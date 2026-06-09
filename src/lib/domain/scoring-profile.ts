/**
 * The per-campaign Scoring Profile (ADR 0004): the point value for every scoring category, set
 * when a campaign is founded and editable by the arbiter thereafter. Standings read the campaign's
 * profile rather than a global constant, so two campaigns can score differently. A category at 0
 * is inert — it grants nothing and is hidden from commanders.
 *
 * This module owns the *shape*, the defaults, and the display metadata (so the founding form and
 * the rules page render from one source). The standings fold consuming the profile is a separate
 * slice; the defaults below are seeded from today's constants so behaviour is unchanged until then.
 */

import { z } from 'zod';
import { POINTS, PAINTING_POINTS } from './standings';

export interface ScoringProfile {
	// Battle outcomes
	win: number;
	draw: number;
	underdog: number;
	narrative: number;
	loss: number;
	// Control milestone — points per step, and the % step itself
	milestonePoints: number;
	milestoneStep: number;
	// Win streak — bounty per run, and the run length that triggers it
	streakBonus: number;
	streakLength: number;
	// Ending a reigning streak
	kingkiller: number;
	// Painting awards (derived from the profile by kind, ADR 0004)
	paintUnit: number;
	paintCharacter: number;
	paintTerrain: number;
}

/**
 * Defaults for a freshly-founded campaign. Seeded from the existing scoring constants so a campaign
 * left untouched scores exactly as the app did before profiles existed. The three categories added
 * with profiles — loss, win streak, kingkiller — default to **off** (0), so they only count once an
 * arbiter deliberately turns them on.
 */
export const DEFAULT_PROFILE: ScoringProfile = {
	win: POINTS.win,
	draw: POINTS.draw,
	underdog: POINTS.underdog,
	narrative: POINTS.narrative,
	loss: 0,
	milestonePoints: 1,
	milestoneStep: 20,
	streakBonus: 0,
	streakLength: 3,
	kingkiller: 0,
	paintUnit: PAINTING_POINTS.unit,
	paintCharacter: PAINTING_POINTS.character,
	paintTerrain: PAINTING_POINTS.terrain
};

const points = z.number().int().min(0, 'Points cannot be negative.').max(99, 'Keep it under 100.');

export const scoringProfileSchema = z.object({
	win: points,
	draw: points,
	underdog: points,
	narrative: points,
	loss: points,
	milestonePoints: points,
	milestoneStep: z
		.number()
		.int()
		.min(5, 'A control step of at least 5%.')
		.max(100, 'A control step of at most 100%.'),
	streakBonus: points,
	streakLength: z
		.number()
		.int()
		.min(2, 'A streak is at least 2 wins.')
		.max(10, 'Keep the streak length at 10 or fewer.'),
	kingkiller: points,
	paintUnit: points,
	paintCharacter: points,
	paintTerrain: points
}) satisfies z.ZodType<ScoringProfile>;

/** A scoring category as the founding form and rules page render it. */
export interface CategoryMeta {
	/** The profile key holding this category's point value. */
	key: keyof ScoringProfile;
	label: string;
	/** What earns it — shown as the field hint. */
	hint: string;
	/** Optional second knob (the milestone % step, the streak run length). */
	threshold?: {
		key: keyof ScoringProfile;
		/** Rendered around the input, e.g. "every [ 20 ] %". */
		prefix: string;
		suffix: string;
	};
}

export interface CategoryGroup {
	/** Console-style section label, e.g. "Battle". */
	title: string;
	blurb: string;
	categories: CategoryMeta[];
}

/**
 * The editable categories, grouped for the founding form's scoring section and reused by the rules
 * page. Order here is the order both surfaces render. Threshold knobs are edition-meta, not points.
 */
export const SCORING_GROUPS: CategoryGroup[] = [
	{
		title: 'Battle',
		blurb: 'Points that fall out of each report’s outcome.',
		categories: [
			{ key: 'win', label: 'Win', hint: 'Each warband on the winning side.' },
			{ key: 'draw', label: 'Draw', hint: 'Every combatant when a battle stalemates.' },
			{ key: 'underdog', label: 'Underdog', hint: 'Beating a foe who held a bigger share here.' },
			{ key: 'narrative', label: 'Narrative', hint: 'Every combatant in a report with a narrative.' },
			{ key: 'loss', label: 'Loss', hint: 'Each warband on the losing side of a decisive game.' }
		]
	},
	{
		title: 'Control',
		blurb: 'Banked for ground held on a world, never lost once earned.',
		categories: [
			{
				key: 'milestonePoints',
				label: 'Control milestone',
				hint: 'Banked each time a warband reaches the next step of control on a world.',
				threshold: { key: 'milestoneStep', prefix: 'every', suffix: '% control' }
			}
		]
	},
	{
		title: 'Streak',
		blurb: 'Rewards for momentum across the whole campaign.',
		categories: [
			{
				key: 'streakBonus',
				label: 'Win streak',
				hint: 'A bounty for an unbroken run of decisive wins; a draw or loss resets it.',
				threshold: { key: 'streakLength', prefix: 'every', suffix: 'wins in a row' }
			},
			{
				key: 'kingkiller',
				label: 'Kingkiller',
				hint: 'Ending another warband’s reigning streak, by beating or drawing them.'
			}
		]
	},
	{
		title: 'Painting',
		blurb: 'Granted by hand by the arbiter; points read live from this profile.',
		categories: [
			{ key: 'paintUnit', label: 'A unit', hint: 'A painted infantry or vehicle squad.' },
			{ key: 'paintCharacter', label: 'Character / monster / vehicle', hint: 'A painted single model.' },
			{ key: 'paintTerrain', label: 'Terrain / display base', hint: 'A painted terrain or display piece.' }
		]
	}
];
