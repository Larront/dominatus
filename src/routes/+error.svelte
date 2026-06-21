<script lang="ts">
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';

	// Cogitator voice in the chrome, plain language on the recovery. A 404 reads as a lost
	// signal; anything else is a fault in the machine. The real status and message stay visible
	// so the screen never hides what actually happened.
	const isNotFound = $derived(page.status === 404);
	const kicker = $derived(isNotFound ? '// Signal Lost' : '// Cogitator Fault');
	const heading = $derived(isNotFound ? 'Location not found' : 'Something went wrong');
	const detail = $derived(
		isNotFound
			? 'This cogitator has no record of that location. It may have moved, or the link is stale.'
			: 'The cogitator hit a fault handling that request. Returning to the map is the safest course.'
	);
</script>

<main
	class="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 text-center"
>
	<!-- A faint phosphor bloom and edge vignette, the same atmosphere the hub carries. -->
	<div aria-hidden="true" class="pointer-events-none absolute inset-0">
		<div
			class="absolute top-1/2 left-1/2 h-[420px] w-[820px] max-w-[150vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,var(--color-accent-soft),transparent_70%)] opacity-60 blur-[42px]"
		></div>
		<div class="absolute inset-0 shadow-[inset_0_0_240px_70px_rgba(0,0,0,0.85)]"></div>
	</div>

	<div class="relative flex flex-col items-center">
		<p class="mb-4 font-display text-[10px] font-semibold tracking-[0.18em] text-accent uppercase">
			{kicker}
		</p>

		<p
			class="font-display text-[88px] leading-none font-bold tracking-[0.02em] text-ink tabular-nums max-[520px]:text-[64px]"
		>
			{page.status}
		</p>

		<h1 class="mt-3 font-display text-[18px] font-semibold tracking-[0.01em] text-ink">
			{heading}
		</h1>

		<p class="mt-3 max-w-[46ch] font-body text-[13px] leading-[1.55] text-ink-dim">
			{detail}
		</p>

		{#if page.error?.message && page.error.message !== heading}
			<p class="mt-2 font-body text-[12px] text-ink-faint">{page.error.message}</p>
		{/if}

		<div class="mt-7">
			<Button href="/" variant="primary">Return to map</Button>
		</div>
	</div>
</main>
