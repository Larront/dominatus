import type { DerivedControl } from './control';

/** A world plus its control state, as sent to the client for the system view. */
export interface WorldWithControl {
	id: string;
	name: string;
	type: string;
	/** Strategic value, e.g. "Critical", "Decisive", "Moderate". */
	value: string | null;
	garrison: string | null;
	supply: string | null;
	description: string | null;
	/** PixelPlanets render recipe (e.g. "lava", "ocean", "hive"). */
	render: string;
	shares: { warbandId: string; share: number }[];
	derived: DerivedControl;
	/** Planetary effects currently in play on this world (descriptive; ADR/CONTEXT). */
	effects: { id: string; title: string; description: string | null }[];
}

/**
 * One row of the map's Worlds Held tally (CONTEXT.md): a warband and the count of worlds it
 * outright owns. The spatial metric the map legend shows — distinct from the points Standings.
 */
export interface WorldsHeld {
	id: string;
	name: string;
	short: string;
	color: string;
	/** Number of worlds this warband outright owns (holds a majority of). */
	held: number;
	/** True when the viewing user commands this warband. */
	you: boolean;
}

/**
 * Worlds Held (CONTEXT.md): per warband, the count of worlds it outright owns, strongest first
 * (ties broken by name). This is the map legend's spatial tally — deliberately separate from the
 * points Standings (ADR 0003), which fold the report log. A pure derivation over current control.
 */
export function worldsHeld(
	worlds: WorldWithControl[],
	warbands: { id: string; name: string; short: string; color: string; commanderUserId: string }[],
	viewerId?: string | null
): WorldsHeld[] {
	return warbands
		.map((wb) => ({
			id: wb.id,
			name: wb.name,
			short: wb.short,
			color: wb.color,
			held: worlds.filter((w) => w.derived.owner === wb.id).length,
			you: viewerId ? wb.commanderUserId === viewerId : false
		}))
		.sort((a, b) => b.held - a.held || a.name.localeCompare(b.name));
}
