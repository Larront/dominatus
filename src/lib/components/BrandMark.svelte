<script lang="ts">
	// The Dominatus sigil: a star ringed by a dashed orbit and one world on its ecliptic.
	// Inherits `currentColor`, so callers set the hue and any glow via text/drop-shadow utilities.
	let { class: klass = '' }: { class?: string } = $props();
</script>

<span class={klass} aria-hidden="true">
	<svg viewBox="0 0 32 32" class="size-full">
		<circle
			cx="16"
			cy="16"
			r="13"
			fill="none"
			stroke="currentColor"
			stroke-width="1"
			stroke-dasharray="2 3"
			opacity="0.7"
		/>
		<ellipse
			cx="16"
			cy="16"
			rx="13"
			ry="5.5"
			fill="none"
			stroke="currentColor"
			stroke-width="1.2"
		/>
		<circle cx="16" cy="16" r="3" fill="currentColor" />
		<circle cx="29" cy="16" r="1.7" fill="currentColor" />
	</svg>
</span>
