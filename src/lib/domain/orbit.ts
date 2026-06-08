/**
 * Deterministic orbital geometry. A world record stores no map position (see the
 * world schema), so each world's place on the map is derived here from a stable
 * hash of its id plus its index in the stably-ordered system. Same world → same
 * orbit on every render; pure and dependency-free so it is testable and produces
 * identical positions on the server and the client.
 */

export interface OrbitGeometry {
	/** Orbit diameter as a fraction of the square system stage (0–1). */
	orbit: number;
	/** Resting angle in degrees (0–360): where the world sits before it drifts. */
	angle: number;
	/** Planet diameter in vmin units, so worlds scale with the viewport. */
	size: number;
	/** Seconds for one full revolution; outer orbits drift slower. */
	duration: number;
}

/** FNV-1a string hash → unsigned 32-bit. Stable across runtimes. */
function hash(str: string): number {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

/** A well-spread 0–1 value derived from an id and a salt. */
function unit(id: string, salt: string): number {
	return (hash(id + salt) % 100_000) / 100_000;
}

function clamp(v: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, v));
}

const INNER = 0.62; // innermost orbit clears the central star (even when the tilt compresses it)
const OUTER = 0.96; // outermost orbit stays inside the stage
const MIN_DUR = 150;
const MAX_DUR = 330;
const GOLDEN = 137.508; // golden-angle spacing keeps worlds from clumping

export function orbitFor(world: { id: string }, index: number, total: number): OrbitGeometry {
	// Even ring spacing keeps the system legible; a small hash jitter stops the
	// concentric banding from reading as mechanical.
	const t = total <= 1 ? 0.45 : index / (total - 1);
	const jitter = (unit(world.id, 'r') - 0.5) * 0.03;
	const orbit = clamp(INNER + (OUTER - INNER) * t + jitter, INNER - 0.02, OUTER);

	// Golden-angle base by index spreads worlds evenly around the system; a hash
	// nudge keeps it from looking perfectly regular and stays stable per world.
	const angle = Math.round((index * GOLDEN + unit(world.id, 'a') * 32) % 360);

	// Diameter in vmin so planets scale with the viewport; outer worlds drift
	// slower (loosely Keplerian), with per-world jitter so nothing syncs up.
	const size = Math.round((7 + unit(world.id, 's') * 2) * 100) / 100;
	const duration = Math.round(MIN_DUR + (MAX_DUR - MIN_DUR) * t + unit(world.id, 'd') * 28);

	return { orbit, angle, size, duration };
}

/** Geometry for a whole system, keyed by world id. */
export function systemGeometry(worlds: { id: string }[]): Map<string, OrbitGeometry> {
	return new Map(worlds.map((w, i) => [w.id, orbitFor(w, i, worlds.length)]));
}
