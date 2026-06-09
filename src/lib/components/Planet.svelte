<script lang="ts">
	import { untrack } from 'svelte';
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

	// Attachment: mount one PixelPlanet (one WebGL context) on the canvas, disposed on teardown.
	// `render`/`resolution` are read *untracked* so the attachment runs exactly once per mounted
	// canvas — without untrack it re-subscribes and a benign prop change (e.g. `name` updating on
	// every keystroke) would re-run it, spawning a fresh WebGL context each time until the browser
	// hits its context limit and contexts start failing. Recreation on a genuine render/resolution
	// change is handled by the {#key} below, which remounts the canvas node and re-runs this.
	function planet(node: HTMLCanvasElement) {
		const instance = untrack(() => new PixelPlanet(node, render, { resolution }));
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
