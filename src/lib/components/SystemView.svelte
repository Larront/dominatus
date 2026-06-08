<script lang="ts">
	import { onMount } from 'svelte';
	import Planet from './Planet.svelte';
	import StandingsLegend from './StandingsLegend.svelte';
	import { systemGeometry, type OrbitGeometry } from '$lib/domain/orbit';
	import type { WorldWithControl } from '$lib/domain/world';

	interface WarbandRef {
		id: string;
		name: string;
		short: string;
		color: string;
	}
	interface Standing {
		id: string;
		name: string;
		short: string;
		color: string;
		held: number;
		you: boolean;
	}

	let {
		worlds,
		warbands,
		standings,
		selectedId,
		campaignName,
		basePath
	}: {
		worlds: WorldWithControl[];
		warbands: WarbandRef[];
		standings: Standing[];
		selectedId?: string;
		campaignName: string;
		basePath: string;
	} = $props();

	const geo = $derived(systemGeometry(worlds));
	const byId = $derived(new Map(warbands.map((w) => [w.id, w])));

	// Per-world map presentation. Control state is always carried by a label as
	// well as colour (the not-by-colour-alone rule).
	function ownerColor(w: WorldWithControl): string {
		if (w.derived.contested) return 'var(--state-contested)';
		if (w.derived.unclaimed) return 'var(--text-faint)';
		return byId.get(w.derived.owner ?? '')?.color ?? 'var(--text-dim)';
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
</script>

<div class="stage">
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
												<span class="world-owner unclaimed">
													<span class="dot"></span>Unclaimed
												</span>
											{:else}
												<span class="world-owner">
													<span class="dot"></span>{shortOf(world.derived.owner)}
												</span>
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

	<p class="sun-label">{campaignName} · Primary</p>

	{#if worlds.length === 0}
		<div class="empty-system">
			<p class="empty-title">No worlds charted</p>
			<p class="empty-sub">
				This system has no worlds yet. Once the arbiter charts them, they will appear here in orbit.
			</p>
		</div>
	{/if}

	<StandingsLegend {standings} />

	<div class="view-toggle" role="group" aria-label="Map projection">
		<button class="vt-btn" class:active={view === 'tilt'} onclick={() => setView('tilt')}>
			3D
		</button>
		<button class="vt-btn" class:active={view === 'flat'} onclick={() => setView('flat')}>
			Top-down
		</button>
	</div>

	<p class="map-hint">
		<svg viewBox="0 0 14 14" aria-hidden="true">
			<circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.2" />
			<path d="M7 0v3M7 11v3M0 7h3M11 7h3" stroke="currentColor" stroke-width="1.2" />
		</svg>
		Select a world for intel
	</p>

	<div class="vignette" aria-hidden="true"></div>
</div>

<style>
	.stage {
		position: relative;
		height: 100%;
		width: 100%;
		overflow: hidden;
		background: var(--bg-0);
	}

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

	/* rings: a circle in the plane → ellipse once the plane tilts. Centred with
	   negative margins so the transform stays free for state, not positioning. */
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

	/* central star — billboarded against the plane tilt so the pixel art stays
	   square-on and crisp. */
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
	/* star nameplate lives at stage level so the tilt can't drag it off the star */
	.sun-label {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, clamp(48px, 12vmin, 116px));
		z-index: 2;
		font-family: var(--font-display);
		font-weight: 500;
		font-size: 9.5px;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--sun-glow);
		text-shadow: 0 0 8px var(--sun-glow);
		white-space: nowrap;
		pointer-events: none;
	}

	/* the orbit box revolves; each inner layer undoes one transform so the world
	   ends up upright and facing the camera. */
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
		/* transform: translateZ(16px); */
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

	/* ---- empty state ---- */
	.empty-system {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 2;
		max-width: 360px;
		text-align: center;
	}
	.empty-title {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 18px;
		color: var(--text);
		margin-bottom: 8px;
	}
	.empty-sub {
		font-family: var(--font-body);
		font-size: 13px;
		line-height: 1.55;
		color: var(--text-dim);
	}

	/* ---- view toggle ---- */
	.view-toggle {
		position: absolute;
		top: 20px;
		right: 20px;
		z-index: 6;
		display: flex;
		border: 1px solid var(--border);
		background: color-mix(in srgb, var(--panel) 86%, transparent);
		backdrop-filter: blur(8px);
	}
	.vt-btn {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 10px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-dim);
		background: none;
		border: none;
		padding: 9px 13px;
		cursor: pointer;
		transition:
			color 0.12s,
			background 0.12s;
	}
	.vt-btn + .vt-btn {
		border-left: 1px solid var(--border);
	}
	.vt-btn:hover {
		color: var(--accent);
	}
	.vt-btn:focus-visible {
		outline: none;
		color: var(--accent);
		box-shadow: inset 0 0 0 1px var(--accent-mid);
	}
	.vt-btn.active {
		color: var(--bg-0);
		background: var(--accent);
	}

	/* ---- map hint ---- */
	.map-hint {
		position: absolute;
		right: 20px;
		bottom: 20px;
		z-index: 6;
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: var(--font-display);
		font-weight: 500;
		font-size: 9.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-faint);
	}
	.map-hint svg {
		width: 13px;
		height: 13px;
	}

	@media (max-width: 720px) {
		.map-hint {
			display: none;
		}
		.view-toggle {
			top: 12px;
			right: 12px;
		}
		/* keep the whole system inboard so edge worlds + their labels don't clip */
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
