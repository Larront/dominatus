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
