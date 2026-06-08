/**
 * Control derivation. The stored source of truth is a share-per-warband
 * (see `world_control`); owner / contested / unclaimed are always derived here,
 * never persisted, so they can never disagree with the shares.
 *
 * The majority threshold below is the one derivation rule we commit to now; the
 * deferred campaign rules govern how shares *move*, not how they are read.
 */

export interface ControlShare {
	warbandId: string;
	share: number;
}

export interface DerivedControl {
	/** Warband holding a majority (> 50%), or null if none. */
	owner: string | null;
	/** Highest-share warband, even without a majority; null if unclaimed. */
	leader: string | null;
	/** Shares exist but no warband holds a majority. */
	contested: boolean;
	/** No warband holds any share. */
	unclaimed: boolean;
}

const MAJORITY_THRESHOLD = 50;

export function deriveControl(shares: ControlShare[]): DerivedControl {
	const held = shares.filter((s) => s.share > 0);

	if (held.length === 0) {
		return { owner: null, leader: null, contested: false, unclaimed: true };
	}

	const sorted = [...held].sort((a, b) => b.share - a.share);
	const leader = sorted[0].warbandId;
	const owner = sorted[0].share > MAJORITY_THRESHOLD ? leader : null;

	return { owner, leader, contested: owner === null, unclaimed: false };
}
