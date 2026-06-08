<script lang="ts">
	import { PixelPlanet } from '$lib/pixelplanet/pixelplanet';

	let {
		render = 'hive',
		size = 96,
		resolution = 100,
		name = ''
	}: { render?: string; size?: number | string; resolution?: number; name?: string } = $props();

	// `size` is the on-screen diameter (px number, or any CSS length such as a
	// clamp()); `resolution` is the fixed pixel-art backing-buffer size.
	const dim = $derived(typeof size === 'number' ? `${size}px` : size);

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
		style="width: {dim}; height: {dim}; image-rendering: pixelated;"
		aria-label={name}
	></canvas>
{/key}
