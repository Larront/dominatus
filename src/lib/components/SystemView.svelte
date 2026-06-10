<script lang="ts">
	import { onMount } from 'svelte';
	import Planet from './Planet.svelte';
	import StandingsLegend from './StandingsLegend.svelte';
	import { systemGeometry, type OrbitGeometry } from '$lib/domain/orbit';
	import type { WorldWithControl, WorldsHeld } from '$lib/domain/world';

	interface WarbandRef {
		id: string;
		name: string;
		short: string;
		color: string;
	}

	let {
		worlds,
		warbands,
		worldsHeld,
		selectedId,
		campaignName,
		basePath
	}: {
		worlds: WorldWithControl[];
		warbands: WarbandRef[];
		worldsHeld: WorldsHeld[];
		selectedId?: string;
		campaignName: string;
		basePath: string;
	} = $props();

	const geo = $derived(systemGeometry(worlds));
	const byId = $derived(new Map(warbands.map((w) => [w.id, w])));

	// Per-world map presentation. Control state is always carried by a label as
	// well as colour (the not-by-colour-alone rule).
	function ownerColor(w: WorldWithControl): string {
		if (w.derived.contested) return 'var(--color-state-contested)';
		if (w.derived.unclaimed) return 'var(--color-ink-faint)';
		return byId.get(w.derived.owner ?? '')?.color ?? 'var(--color-ink-dim)';
	}
	const shortOf = (id: string | null) => (id ? (byId.get(id)?.short ?? '??') : '??');

	function stateLabel(w: WorldWithControl): string {
		if (w.derived.contested) return 'contested';
		if (w.derived.unclaimed) return 'unclaimed';
		return `held by ${byId.get(w.derived.owner ?? '')?.name ?? 'a warband'}`;
	}

	// Negative animation-delay parks each world at its resting angle before drift.
	const startDelay = (g: OrbitGeometry) => -(g.angle / 360) * g.duration;

	// Planet diameter scales with the viewport (vmin) but stays within sane bounds.
	const planetSize = (g: OrbitGeometry) => `clamp(28px, calc(${g.size} * 1vmin), 92px)`;

	// View: dramatic 3D tilt vs flat top-down. Default tilt; remembered per device.
	type View = 'tilt' | 'flat';
	let view = $state<View>('tilt');
	const tiltDeg = $derived(view === 'tilt' ? '72deg' : '0deg');

	onMount(() => {
		const saved = localStorage.getItem('dominatus:view');
		if (saved === 'flat' || saved === 'tilt') view = saved;
	});
	function setView(v: View) {
		view = v;
		localStorage.setItem('dominatus:view', v);
	}

	// Calm the drift while hovering or while a world is open for reading.
	let hovered = $state(false);
	const paused = $derived(hovered || !!selectedId);

	// Decorative starfield, client-only so SSR markup stays deterministic.
	interface Star {
		x: number;
		y: number;
		s: number;
		tw: number;
		delay: number;
	}
	let stars = $state<Star[]>([]);
	onMount(() => {
		const arr: Star[] = [];
		for (let i = 0; i < 130; i++) {
			arr.push({
				x: Math.random() * 100,
				y: Math.random() * 100,
				s: Math.random() < 0.85 ? 1 : 2,
				tw: 2.5 + Math.random() * 5,
				delay: Math.random() * 5
			});
		}
		stars = arr;
	});

	// No base background or hover/focus colour: each state owns its own, so the active `bg-accent
	// text-void` never collides with a base `bg-transparent` or a `hover:text-accent` that would
	// otherwise paint the selected label accent-on-accent (unreadable).
	const vtBtn =
		'border-0 px-[13px] py-[9px] font-display text-[10px] font-semibold tracking-[0.12em] uppercase cursor-pointer transition-[color,background-color] duration-[120ms] focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--color-accent-mid)] [&+&]:border-l [&+&]:border-border';
</script>

<div class="relative h-full w-full overflow-hidden bg-void">
	<div class="space-bg"></div>
	<div class="starfield" aria-hidden="true">
		{#each stars as st, i (i)}
			<span
				class="star"
				style="left:{st.x}%; top:{st.y}%; width:{st.s}px; height:{st.s}px; --tw:{st.tw}s; animation-delay:{st.delay}s"
			></span>
		{/each}
	</div>

	<div class="scene" style="--tilt:{tiltDeg}">
		<div
			class="system"
			class:paused
			role="presentation"
			onpointerenter={() => (hovered = true)}
			onpointerleave={() => (hovered = false)}
		>
			<!-- orbit rings (dashed ellipses under tilt; circles when flat) -->
			{#each worlds as world (world.id)}
				{@const g = geo.get(world.id)}
				{#if g}
					<div
						class="orbit-ring"
						class:active={selectedId === world.id}
						style="--orbit:{g.orbit}"
					></div>
				{/if}
			{/each}

			<div class="scanner" aria-hidden="true"></div>

			<!-- central star -->
			<div class="sun">
				<div class="sun-facer">
					<Planet
						render="star"
						size="clamp(38px, 9vmin, 96px)"
						resolution={200}
						name="{campaignName} primary star"
					/>
				</div>
			</div>

			<!-- orbiting worlds -->
			{#each worlds as world (world.id)}
				{@const g = geo.get(world.id)}
				{#if g}
					<div
						class="orbit"
						style="--orbit:{g.orbit}; --dur:{g.duration}s; --delay:{startDelay(
							g
						)}s; --angle:{g.angle}deg"
					>
						<div class="anchor">
							<div
								class="billboard"
								style="--dur:{g.duration}s; --delay:{startDelay(g)}s; --angle:{g.angle}deg"
							>
								<div class="facer">
									<a
										class="world"
										class:selected={selectedId === world.id}
										href="{basePath}?world={world.id}"
										aria-label="{world.name} — {stateLabel(world)}"
										style="--fcol:{ownerColor(world)}; --size:{g.size}px"
									>
										<span class="world-canvas">
											<Planet
												render={world.render}
												size={planetSize(g)}
												resolution={110}
												name={world.name}
											/>
										</span>
										<span class="world-tag">
											<span class="world-name">{world.name}</span>
											{#if world.derived.contested}
												<span class="world-flag">◈ Contested</span>
											{:else if world.derived.unclaimed}
												<span class="world-owner unclaimed"><span class="dot"></span>Unclaimed</span
												>
											{:else}
												<span class="world-owner"
													><span class="dot"></span>{shortOf(world.derived.owner)}</span
												>
											{/if}
										</span>
									</a>
								</div>
							</div>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</div>

	<p
		class="pointer-events-none absolute top-1/2 left-1/2 z-[2] [transform:translate(-50%,clamp(48px,12vmin,116px))] font-display text-[9.5px] font-medium tracking-[0.24em] whitespace-nowrap text-sun-glow uppercase [text-shadow:0_0_8px_var(--color-sun-glow)]"
	>
		{campaignName} · Primary
	</p>

	{#if worlds.length === 0}
		<div
			class="absolute top-1/2 left-1/2 z-[2] max-w-[360px] -translate-x-1/2 -translate-y-1/2 text-center"
		>
			<p class="mb-2 font-display text-[18px] font-bold text-ink">No worlds charted</p>
			<p class="font-body text-[13px] leading-[1.55] text-ink-dim">
				This system has no worlds yet. Once the arbiter charts them, they will appear here in orbit.
			</p>
		</div>
	{/if}

	<StandingsLegend {worldsHeld} />

	<div
		class="absolute top-5 right-5 z-[6] flex border border-border bg-[color-mix(in_srgb,var(--color-panel)_86%,transparent)] backdrop-blur-[8px] max-[720px]:top-3 max-[720px]:right-3"
		role="group"
		aria-label="Map projection"
	>
		<button
			class="{vtBtn} {view === 'tilt'
				? 'bg-accent text-void'
				: 'bg-transparent text-ink-dim hover:text-accent focus-visible:text-accent'}"
			onclick={() => setView('tilt')}>3D</button
		>
		<button
			class="{vtBtn} {view === 'flat'
				? 'bg-accent text-void'
				: 'bg-transparent text-ink-dim hover:text-accent focus-visible:text-accent'}"
			onclick={() => setView('flat')}>Top-down</button
		>
	</div>

	<p
		class="absolute right-5 bottom-5 z-[6] flex items-center gap-2 font-display text-[9.5px] font-medium tracking-[0.12em] text-ink-faint uppercase max-[720px]:hidden"
	>
		<svg viewBox="0 0 14 14" class="size-[13px]" aria-hidden="true">
			<circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.2" />
			<path d="M7 0v3M7 11v3M0 7h3M11 7h3" stroke="currentColor" stroke-width="1.2" />
		</svg>
		Select a world for intel
	</p>

	<div class="vignette" aria-hidden="true"></div>
</div>

<style>
	/* The orbital map's irreducible mechanics + atmosphere: a tilted 3D ecliptic, the
	   conic scanner sweep, long-period orbital keyframes, billboarding, and the starfield.
	   Kept as scoped CSS (transforms with CSS vars, masks, keyframes) — utilities can't
	   express these, and the chrome around them is converted to Tailwind. */

	/* ---- atmosphere ---- */
	.space-bg {
		position: absolute;
		inset: 0;
		z-index: 0;
		background: radial-gradient(
			120% 92% at 50% 42%,
			hsl(150 40% 9% / 0.5) 0%,
			var(--bg-1) 46%,
			var(--bg-0) 100%
		);
	}
	.space-bg::before {
		content: '';
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(var(--grid-line) 1px, transparent 1px),
			linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
		background-size: 48px 48px;
		mask-image: radial-gradient(closest-side at 50% 50%, #000 25%, transparent 86%);
	}
	.starfield {
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
	}
	.star {
		position: absolute;
		background: var(--star);
		animation: twinkle var(--tw, 4s) ease-in-out infinite;
	}
	@keyframes twinkle {
		0%,
		100% {
			opacity: 0.12;
		}
		50% {
			opacity: 0.85;
		}
	}
	.vignette {
		position: absolute;
		inset: 0;
		z-index: 5;
		pointer-events: none;
		box-shadow: inset 0 0 140px 10px rgba(0, 0, 0, 0.5);
		background: radial-gradient(130% 130% at 50% 48%, transparent 72%, rgba(0, 0, 0, 0.32) 100%);
	}

	/* ---- 3D scene ---- */
	.scene {
		position: absolute;
		inset: 0;
		z-index: 1;
		display: grid;
		place-items: center;
		perspective: 1500px;
		perspective-origin: 50% 44%;
	}
	.system {
		position: relative;
		width: min(80vh, 92vw);
		height: min(80vh, 92vw);
		max-width: 880px;
		max-height: 880px;
		transform-style: preserve-3d;
		transform: rotateX(var(--tilt));
		transition: transform 0.85s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.orbit-ring,
	.orbit {
		position: absolute;
		top: 50%;
		left: 50%;
		width: calc(var(--orbit) * 100%);
		height: calc(var(--orbit) * 100%);
		margin-left: calc(var(--orbit) * -50%);
		margin-top: calc(var(--orbit) * -50%);
	}
	.orbit-ring {
		border: 1px dashed var(--ring);
		border-radius: 50%;
		pointer-events: none;
		transition: border-color 0.25s;
	}
	.orbit-ring.active {
		border-style: solid;
		border-color: var(--ring-strong);
		box-shadow: inset 0 0 28px var(--accent-soft);
	}

	.scanner {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 100%;
		height: 100%;
		margin-left: -50%;
		margin-top: -50%;
		border-radius: 50%;
		pointer-events: none;
		opacity: 0.45;
		background: conic-gradient(
			from 0deg,
			transparent 0deg,
			var(--accent-soft) 16deg,
			transparent 38deg
		);
		mask: radial-gradient(circle, transparent 12%, #000 12.5%, #000 49%, transparent 50%);
		-webkit-mask: radial-gradient(circle, transparent 12%, #000 12.5%, #000 49%, transparent 50%);
		animation: revolve 30s linear infinite;
	}

	.sun {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		transform-style: preserve-3d;
		pointer-events: none;
		line-height: 0;
	}
	.sun-facer {
		transform: rotateX(calc(-1 * var(--tilt)));
		transition: transform 0.85s cubic-bezier(0.16, 1, 0.3, 1);
		line-height: 0;
		filter: drop-shadow(0 0 30px var(--sun-glow)) drop-shadow(0 0 80px var(--accent-soft));
	}

	.orbit {
		transform-style: preserve-3d;
		pointer-events: none;
		animation: revolve var(--dur) linear infinite;
		animation-delay: var(--delay);
	}
	@keyframes revolve {
		from {
			transform: rotateZ(0deg);
		}
		to {
			transform: rotateZ(360deg);
		}
	}
	.anchor {
		position: absolute;
		top: 0;
		left: 50%;
		width: 0;
		height: 0;
		transform-style: preserve-3d;
	}
	.billboard {
		transform-style: preserve-3d;
		animation: revolve var(--dur) linear infinite reverse;
		animation-delay: var(--delay);
	}
	.facer {
		transform: rotateX(calc(-1 * var(--tilt)));
		transition: transform 0.85s cubic-bezier(0.16, 1, 0.3, 1);
		transform-style: preserve-3d;
	}

	.world {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: center;
		transform: translate(-50%, -50%);
		pointer-events: auto;
		text-decoration: none;
		cursor: pointer;
	}
	.world-canvas {
		display: block;
		line-height: 0;
		transition: transform 0.18s ease;
		filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.6));
	}
	.world:hover .world-canvas {
		transform: scale(1.1);
	}
	.world.selected .world-canvas {
		filter: drop-shadow(0 0 14px var(--fcol)) drop-shadow(0 3px 8px rgba(0, 0, 0, 0.6));
	}
	.world:focus-visible {
		outline: none;
	}
	.world:focus-visible .world-canvas {
		transform: scale(1.1);
		filter: drop-shadow(0 0 0 2px var(--accent)) drop-shadow(0 0 14px var(--accent-soft));
	}

	.world-tag {
		position: absolute;
		top: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		margin-top: 9px;
		white-space: nowrap;
		pointer-events: none;
	}
	.world-name {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: clamp(13px, 1.6vmin, 17px);
		letter-spacing: 0.02em;
		color: var(--text);
		text-shadow:
			0 0 2px #000,
			0 2px 5px #000;
	}
	.world-owner,
	.world-flag {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 9.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		display: flex;
		align-items: center;
		gap: 5px;
	}
	.world-owner {
		color: var(--fcol);
	}
	.world-owner.unclaimed {
		color: var(--text-dim);
	}
	.world-owner .dot {
		width: 6px;
		height: 6px;
		background: var(--fcol);
		box-shadow: 0 0 6px var(--fcol);
	}
	.world-owner.unclaimed .dot {
		box-shadow: none;
	}
	.world-flag {
		color: var(--state-contested);
		text-shadow: 0 0 8px color-mix(in srgb, var(--state-contested) 60%, transparent);
	}

	/* pause drift on hover / while reading */
	.system.paused .orbit,
	.system.paused .billboard,
	.system.paused .scanner {
		animation-play-state: paused;
	}

	@media (max-width: 720px) {
		.system {
			width: min(60vh, 74vw);
			height: min(60vh, 74vw);
		}
		.scene {
			perspective-origin: 50% 40%;
		}
	}

	/* ---- reduced motion: hold each world at its resting angle, no drift ---- */
	@media (prefers-reduced-motion: reduce) {
		.orbit {
			animation: none;
			transform: rotateZ(var(--angle));
		}
		.billboard {
			animation: none;
			transform: rotateZ(calc(-1 * var(--angle)));
		}
		.scanner {
			animation: none;
		}
		.star {
			animation: none;
			opacity: 0.5;
		}
		.system,
		.sun-facer,
		.facer {
			transition: none;
		}
	}
</style>
