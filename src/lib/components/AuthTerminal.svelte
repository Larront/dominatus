<script lang="ts">
	import type { Snippet } from 'svelte';
	import BrandMark from '$lib/components/BrandMark.svelte';

	// The shared anonymous shell. Every signed-out screen — access gate, recover access, reset
	// cipher — wears this so they read as one machine in a different mode: the brand crown, a
	// framed access panel with its accent top-bar and a `//` kicker, and an optional escape-hatch
	// line beneath. Content is the panel body; `footer` is the small line under the panel.
	let {
		kicker,
		children,
		footer
	}: {
		kicker: string;
		children: Snippet;
		footer?: Snippet;
	} = $props();
</script>

<div class="flex min-h-[100dvh] items-center justify-center px-5 py-16">
	<div class="w-full max-w-[400px]">
		<div class="mb-7 flex flex-col items-center text-center">
			<BrandMark class="mb-4 size-12 text-accent drop-shadow-[0_0_10px_var(--color-accent-glow)]" />
			<h1 class="font-display text-[26px] font-bold tracking-[0.04em] text-ink">DOMINATUS</h1>
			<p class="mt-1.5 font-display text-[10px] font-medium tracking-[0.18em] text-ink-dim uppercase">
				Campaign Cogitator
			</p>
		</div>

		<div
			class="relative border border-border bg-panel px-6 pt-6 pb-7 before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-[linear-gradient(90deg,var(--color-accent),transparent_70%)] before:opacity-70 before:content-['']"
		>
			<p class="mb-4 font-display text-[10px] font-semibold tracking-[0.14em] text-accent uppercase">
				{kicker}
			</p>
			{@render children()}
		</div>

		{#if footer}
			<p class="mt-4 text-center font-body text-[12px] text-ink-faint">
				{@render footer()}
			</p>
		{/if}
	</div>
</div>
