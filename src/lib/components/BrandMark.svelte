<script lang="ts">
	// The Dominatus sigil: a compass-rose reticle inside a graduated bezel, set on a tilted orbital
	// ecliptic with one world on it. Inherits `currentColor`, so callers set the hue and any glow via
	// text/drop-shadow utilities (the header tints it accent; the splash burns it phosphor).
	let { class: klass = '' }: { class?: string } = $props();
</script>

<span class={klass} aria-hidden="true">
	<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" class="size-full">
		<!-- Orbital ecliptic + its world, tilted off-axis. -->
		<g transform="rotate(-10 32 32)">
			<ellipse cx="32" cy="32" rx="28" ry="10.5" stroke-width="1.4" />
			<circle cx="60" cy="32" r="3.1" fill="currentColor" stroke="none" />
		</g>

		<!-- Bezel: outer ring, a graduated tick band, inner ring. -->
		<circle cx="32" cy="32" r="22" stroke-width="1.4" />
		<circle cx="32" cy="32" r="19.5" stroke-width="2" stroke-dasharray="0.6 2.45" opacity="0.8" />
		<circle cx="32" cy="32" r="17" stroke-width="1.2" />

		<!-- Eight-point compass rose: long cardinals, short diagonals, notched between. -->
		<path
			stroke-width="1.1"
			stroke-linejoin="round"
			d="M48 32 L36.16 30.28 L39.07 24.93 L33.72 27.84 L32 16 L30.28 27.84 L24.93 24.93 L27.84 30.28 L16 32 L27.84 33.72 L24.93 39.07 L30.28 36.16 L32 48 L33.72 36.16 L39.07 39.07 L36.16 33.72 Z"
		/>
		<!-- Faceting spines to the cardinals. -->
		<path
			stroke-width="0.8"
			opacity="0.6"
			d="M32 32 L32 16 M32 32 L48 32 M32 32 L32 48 M32 32 L16 32"
		/>
		<!-- Core. -->
		<circle cx="32" cy="32" r="2.1" fill="currentColor" stroke="none" />
	</svg>
</span>
