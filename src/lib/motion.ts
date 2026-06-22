/**
 * Motion helpers — the JavaScript half of the app's animation vocabulary.
 *
 * Static motion (hover, focus, drawer slide) lives in CSS as `@theme` tokens and
 * `motion-reduce:` utilities; the global reduced-motion rule in `routes/layout.css`
 * is the safety net. This module covers the cases CSS can't reach on its own —
 * Svelte enter/leave transitions for elements that mount and unmount (the gallery
 * lightbox, OCR field fills, chronicle entrances) — and keeps them honouring the
 * same `prefers-reduced-motion` preference.
 *
 * Durations and the easing curve mirror the CSS tokens (`--dur-*`, `--ease-snap`)
 * so JS- and CSS-driven motion feel like one system.
 */
import { MediaQuery } from 'svelte/reactivity';
import { expoOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

/**
 * Reactive `prefers-reduced-motion` preference. Read `.current` in markup or an
 * effect to react to it. During SSR there is no media to query, so it falls back
 * to `false` (motion enabled) — the correct hydration default, because the global
 * CSS rule already neutralises motion for reduced-motion users before hydration.
 */
export const prefersReducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

/** Duration scale in milliseconds — mirrors `--dur-*` in layout.css. */
export const DUR = {
	fast: 120,
	base: 250,
	slow: 320
} as const;

/** Per-item delay for staggered list entrances. */
export const STAGGER_STEP = 40;

/** Near-instant tail used when motion is reduced (matches the 0.01ms CSS floor). */
const REDUCED = 0.01;

/** The house easing curve (`--ease-snap`), in JS form. */
export const ease = expoOut;

interface FadeRiseParams {
	delay?: number;
	duration?: number;
	/** Pixels to travel upward into place. */
	y?: number;
}

/**
 * Fade + rise into place — the default entrance for list rows and revealed panels.
 * Under reduced motion it collapses to a near-instant opacity change (no travel).
 */
export function fadeRise(
	_node: Element,
	{ delay = 0, duration = DUR.base, y = 8 }: FadeRiseParams = {}
): TransitionConfig {
	if (prefersReducedMotion.current) {
		return { delay, duration: REDUCED, css: (t) => `opacity:${t}` };
	}
	return {
		delay,
		duration,
		easing: ease,
		css: (t, u) => `opacity:${t};transform:translateY(${u * y}px)`
	};
}

interface ScaleFadeParams {
	delay?: number;
	duration?: number;
	/** Starting scale; eases up to 1. */
	start?: number;
}

/**
 * Fade + scale from a hair under full size — for overlays that grow into view,
 * like the gallery lightbox. Reduced motion drops the scale and keeps the fade.
 */
export function scaleFade(
	_node: Element,
	{ delay = 0, duration = DUR.slow, start = 0.96 }: ScaleFadeParams = {}
): TransitionConfig {
	if (prefersReducedMotion.current) {
		return { delay, duration: REDUCED, css: (t) => `opacity:${t}` };
	}
	return {
		delay,
		duration,
		easing: ease,
		css: (t, u) => `opacity:${t};transform:scale(${1 - u * (1 - start)})`
	};
}

interface SlideXParams {
	delay?: number;
	duration?: number;
	/** Distance to travel in, as a percentage of the element's own width (100 = fully off-edge). */
	from?: number;
}

/**
 * Slide in/out along the X axis — for edge-anchored panels like the world drawer. `from` is a
 * percentage of the element's own width, so a right-anchored drawer slides its full width off the
 * edge. Used symmetrically as `in:`/`out:`. Reduced motion collapses it to a near-instant fade.
 */
export function slideX(
	_node: Element,
	{ delay = 0, duration = DUR.slow, from = 100 }: SlideXParams = {}
): TransitionConfig {
	if (prefersReducedMotion.current) {
		return { delay, duration: REDUCED, css: (t) => `opacity:${t}` };
	}
	return {
		delay,
		duration,
		easing: ease,
		css: (_t, u) => `transform:translateX(${u * from}%)`
	};
}

/**
 * Delay for the nth item in a staggered entrance. Clamped so long lists don't
 * leave the last row waiting; returns 0 under reduced motion so everything lands
 * at once. Pair with {@link fadeRise}: `in:fadeRise={{ delay: stagger(i) }}`.
 */
export function stagger(index: number, step = STAGGER_STEP, max = 8): number {
	if (prefersReducedMotion.current) return 0;
	return Math.min(index, max) * step;
}
