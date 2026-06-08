<script lang="ts">
	import { PixelPlanet } from '$lib/pixelplanet/pixelplanet';

	let {
		render = 'hive',
		size = 96,
		resolution = 100,
		name = ''
	}: { render?: string; size?: number; resolution?: number; name?: string } = $props();

	// Attachment: mount a PixelPlanet on the canvas, and dispose it on teardown.
	// Re-runs if `render`/`resolution` change (the canvas node is recreated by the key).
	function planet(node: HTMLCanvasElement) {
		const instance = new PixelPlanet(node, render, { resolution });
		return () => instance.dispose();
	}
</script>

{#key `${render}:${resolution}`}
	<canvas
		{@attach planet}
		width={resolution}
		height={resolution}
		style="width: {size}px; height: {size}px; image-rendering: pixelated;"
		aria-label={name}
	></canvas>
{/key}
