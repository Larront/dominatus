<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import BrandMark from '$lib/components/BrandMark.svelte';
	import Planet from '$lib/components/Planet.svelte';

	// A random world greets each visit. Picked on mount (client-only) so SSR and hydration agree on
	// the default; the WebGL canvas only paints client-side anyway. Star is the system's sun, not a
	// world — the hero is always a world.
	const WORLDS = ['ocean', 'lava', 'hive'] as const;
	let render = $state<string>('hive');
	onMount(() => {
		render = WORLDS[Math.floor(Math.random() * WORLDS.length)];
	});

	// Capability readout — rows, not cards. Plain language; the cogitator voice is the ▸ glyph only.
	const readout = [
		'File a battle report in under a minute',
		'Watch control shift across the orbital map',
		'Standings that tally themselves after every battle'
	];
</script>

<div class="relative flex min-h-[100dvh] flex-col overflow-hidden bg-void">
	<!-- Atmosphere: phosphor bloom at the crown, a faint command-grid, an edge vignette. -->
	<div aria-hidden="true" class="pointer-events-none absolute inset-0">
		<div
			class="absolute top-0 left-1/2 h-[520px] w-[980px] max-w-[160vw] -translate-x-1/2 -translate-y-[42%] rounded-full bg-[radial-gradient(ellipse_at_center,var(--color-accent-soft),transparent_70%)] opacity-70 blur-[46px]"
		></div>
		<div
			class="absolute inset-0 bg-[linear-gradient(var(--color-grid-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-grid-line)_1px,transparent_1px)] bg-[size:46px_46px] [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_78%)]"
		></div>
		<div class="absolute inset-0 shadow-[inset_0_0_260px_80px_rgba(0,0,0,0.86)]"></div>
	</div>

	<!-- Top bar: wordmark + a quiet always-available sign-in. -->
	<header class="relative z-10 flex items-center gap-4 px-[26px] py-4 max-[680px]:px-4">
		<span class="flex items-center gap-[11px]">
			<BrandMark class="size-8 shrink-0 text-accent drop-shadow-[0_0_6px_var(--color-accent-glow)]" />
			<span class="font-display text-[16px] font-bold tracking-[0.16em] text-ink">DOMINATUS</span>
		</span>
		<div class="flex-1"></div>
		<Button href="/enter" variant="ghost">Sign in</Button>
	</header>

	<!-- Hero -->
	<main
		class="relative z-10 mx-auto grid w-full max-w-[1140px] flex-1 grid-cols-1 items-center gap-x-12 gap-y-10 px-[26px] py-10 lg:grid-cols-[1.05fr_0.95fr] max-[680px]:px-4"
	>
		<!-- Planet: first in source so it leads on mobile; placed right on desktop. -->
		<div class="planet-in order-1 flex justify-center lg:order-2">
			<div class="relative grid aspect-square w-[min(80vw,420px)] place-items-center">
				<!-- Dashed orbit rings echoing the system map. -->
				<div
					class="pointer-events-none absolute inset-0 rounded-full border border-dashed border-[var(--color-ring)]"
				></div>
				<div
					class="pointer-events-none absolute inset-[14%] rounded-full border border-[var(--color-ring)] opacity-60"
				></div>
				<!-- A lone phosphor contact tracking the outer ring — the system reads as live. -->
				<div
					class="pointer-events-none absolute inset-0 motion-reduce:hidden [animation:spin_24s_linear_infinite]"
				>
					<span
						class="absolute top-0 left-1/2 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_10px_var(--color-accent)]"
					></span>
				</div>
				<Planet {render} size="min(58vw,300px)" resolution={220} name="A world of the contested system" />
			</div>
		</div>

		<!-- Copy + calls to action. -->
		<div class="order-2 flex flex-col items-start lg:order-1">
			<p class="rise font-display text-[11px] font-semibold tracking-[0.34em] text-accent uppercase">
				// Campaign Cogitator
			</p>
			<h1
				class="rise mt-3 font-display text-[clamp(2.9rem,9vw,5.25rem)] leading-[0.92] font-bold tracking-[-0.01em] text-ink text-balance"
				style="--d: 60ms"
			>
				Command the war for a planetary system.
			</h1>
			<p
				class="rise mt-5 max-w-[54ch] font-body text-[14px] leading-[1.6] text-ink-dim"
				style="--d: 130ms"
			>
				Dominatus tracks control of a planetary system as your narrative campaign plays out. File
				battle reports, watch worlds change hands on the orbital map, and keep an arbiter-approved
				record that never loses the story.
			</p>

			<div class="rise mt-7 flex flex-wrap items-center gap-x-5 gap-y-3" style="--d: 200ms">
				<Button href="/enter" variant="primary">Sign in →</Button>
				<a
					href="/enter?mode=enlist"
					class="font-body text-[13px] text-ink-dim transition-colors duration-150 hover:text-accent"
				>
					New here? Enlist a commander
				</a>
			</div>

			<ul
				class="rise mt-9 flex flex-col gap-2 border-t border-border pt-6 font-body text-[12.5px] text-ink-dim"
				style="--d: 280ms"
			>
				{#each readout as item (item)}
					<li class="flex items-center gap-2.5">
						<span class="text-accent" aria-hidden="true">▸</span>
						{item}
					</li>
				{/each}
			</ul>
		</div>
	</main>

	<footer
		class="relative z-10 px-[26px] py-5 font-display text-[10px] font-medium tracking-[0.18em] text-ink-faint uppercase max-[680px]:px-4"
	>
		// Self-hosted · Faction-neutral · Narrative-first
	</footer>
</div>

<style>
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
	}
	.rise {
		animation: rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
		animation-delay: var(--d, 0ms);
	}

	@keyframes planet-rise {
		from {
			opacity: 0;
			transform: scale(0.92);
		}
	}
	.planet-in {
		animation: planet-rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@media (prefers-reduced-motion: reduce) {
		.rise,
		.planet-in {
			animation: none;
		}
	}
</style>
