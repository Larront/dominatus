import type { DerivedControl } from './control';

/** A world plus its control state, as sent to the client for the system view. */
export interface WorldWithControl {
	id: string;
	name: string;
	type: string;
	/** PixelPlanets render recipe (e.g. "lava", "ocean", "hive"). */
	render: string;
	shares: { warbandId: string; share: number }[];
	derived: DerivedControl;
}
