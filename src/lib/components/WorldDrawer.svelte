<script lang="ts">
	import { goto } from '$app/navigation';
	import Planet from './Planet.svelte';
	import type { WorldWithControl } from '$lib/domain/world';
	import type { BattleLogEntry } from '$lib/server/reports';

	interface WarbandRef {
		id: string;
		name: string;
		short: string;
		color: string;
	}

	let {
		world,
		warbands,
		battleLog,
		closeHref,
		reportHref
	}: {
		world: WorldWithControl;
		warbands: WarbandRef[];
		battleLog: BattleLogEntry[];
		closeHref: string;
		reportHref: string;
	} = $props();

	const byId = $derived(new Map(warbands.map((w) => [w.id, w])));
	const wb = (id: string) => byId.get(id);
	const name = (id: string) => byId.get(id)?.name ?? 'Unknown warband';
	const color = (id: string) => byId.get(id)?.color ?? 'var(--text-dim)';

	// Control, sorted strongest-first, plus any share of the world no warband holds.
	const segments = $derived(
		[...world.shares].filter((s) => s.share > 0).sort((a, b) => b.share - a.share)
	);
	const heldTotal = $derived(segments.reduce((sum, s) => sum + s.share, 0));
	const unclaimedShare = $derived(Math.max(0, 100 - heldTotal));

	const owner = $derived(world.derived.owner ? wb(world.derived.owner) : null);
	const leader = $derived(world.derived.leader ? wb(world.derived.leader) : null);
	const leaderShare = $derived(segments[0]?.share ?? 0);
	const ownerColor = $derived(
		world.derived.contested ? 'var(--state-contested)' : (owner?.color ?? 'var(--text-dim)')
	);

	const outcomeMeta = {
		attacker: { label: 'Attacker won', cls: 'res-attacker' },
		defender: { label: 'Defender held', cls: 'res-defender' },
		stalemate: { label: 'Stalemate', cls: 'res-stalemate' }
	} as const;

	// Escape closes the panel; selection lives in the URL so it stays shareable.
	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') goto(closeHref, { keepFocus: false });
	}
</script>

<svelte:window onkeydown={onKey} />

<a class="scrim" href={closeHref} aria-label="Close world intel"></a>

<aside class="drawer" aria-label="{world.name} intel">
	<header class="drawer-hero" style="--fcol: {ownerColor}">
		<a class="drawer-close btn btn-icon" href={closeHref} aria-label="Close">
			<svg viewBox="0 0 16 16" aria-hidden="true">
				<path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" stroke-width="1.6" />
			</svg>
		</a>
		<div class="hero-visual">
			<div class="hero-globe">
				<Planet render={world.render} size={104} resolution={110} name={world.name} />
			</div>
			<div class="hero-text">
				<p class="drawer-kicker">
					{#if world.derived.unclaimed}
						Unclaimed Territory
					{:else if world.derived.contested}
						Contested · No Majority
					{:else}
						Held · {owner?.name}
					{/if}
				</p>
				<h2 class="drawer-title">{world.name}</h2>
				<p class="drawer-type">{world.type}{world.value ? ` · ${world.value}` : ''}</p>
			</div>
		</div>
		{#if world.description}
			<p class="drawer-desc font-prose">{world.description}</p>
		{/if}
	</header>

	<div class="drawer-scroll">
		<section class="section">
			<h3 class="section-label">Control</h3>
			<div class="control-meta">
				<span class="owner-big" style="color: {ownerColor}">
					{#if world.derived.unclaimed}
						Unclaimed
					{:else if world.derived.contested}
						Contested
					{:else}
						{owner?.name}
					{/if}
				</span>
				{#if !world.derived.unclaimed && leader}
					<span class="owner-pct">{leader.name} leads at {leaderShare}%</span>
				{/if}
			</div>

			<div
				class="split-bar"
				role="img"
				aria-label={segments.map((s) => `${name(s.warbandId)} ${s.share}%`).join(', ') ||
					'No control held'}
			>
				{#each segments as seg (seg.warbandId)}
					<span class="split-seg" style="flex: {seg.share}; background: {color(seg.warbandId)}"
					></span>
				{/each}
				{#if unclaimedShare > 0}
					<span class="split-seg split-empty" style="flex: {unclaimedShare}"></span>
				{/if}
			</div>

			{#if segments.length > 0}
				<div class="split-legend">
					{#each segments as seg (seg.warbandId)}
						<span class="split-key">
							<span class="dot" style="background: {color(seg.warbandId)}"></span>
							{name(seg.warbandId)}
							<b>{seg.share}%</b>
						</span>
					{/each}
				</div>
			{/if}
		</section>

		<section class="section">
			<h3 class="section-label">System Intel</h3>
			<div class="stat-grid">
				<div class="stat-cell">
					<div class="k">Classification</div>
					<div class="v">{world.type}</div>
				</div>
				<div class="stat-cell">
					<div class="k">Strategic Value</div>
					<div class="v accent">{world.value ?? 'Unrated'}</div>
				</div>
				<div class="stat-cell">
					<div class="k">Garrison</div>
					<div class="v">{world.garrison ?? 'Unknown'}</div>
				</div>
				<div class="stat-cell">
					<div class="k">Supply Lines</div>
					<div class="v">{world.supply ?? 'Unknown'}</div>
				</div>
			</div>
		</section>

		<section class="section">
			<h3 class="section-label">Battle Log</h3>
			{#if battleLog.length === 0}
				<p class="log-empty">
					No battles logged over {world.name} yet. The first report filed here will appear in this ledger.
				</p>
			{:else}
				<div class="battle-list">
					{#each battleLog as report (report.id)}
						{@const meta = outcomeMeta[report.outcome]}
						<article class="battle">
							<div class="battle-turn">
								<div class="t-num">{report.cycle}</div>
								<div class="t-lbl">Cycle</div>
							</div>
							<div class="battle-main">
								<div class="battle-head">
									<span class="vs-side">
										{#each report.attackers as c (c.warbandId)}
											<span class="dot" style="background: {color(c.warbandId)}"></span>
											{wb(c.warbandId)?.short ?? '??'}
										{/each}
									</span>
									<span class="vs-x">vs</span>
									<span class="vs-side">
										{#each report.defenders as c (c.warbandId)}
											<span class="dot" style="background: {color(c.warbandId)}"></span>
											{wb(c.warbandId)?.short ?? '??'}
										{/each}
									</span>
									<span class="battle-result {meta.cls}">{meta.label}</span>
								</div>
								{#if report.narrative}
									<p class="battle-sub">{report.narrative}</p>
								{/if}
								{#if report.pointsSize}
									<p class="battle-meta">{report.pointsSize} pts engagement</p>
								{/if}
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	</div>

	<footer class="drawer-foot">
		<a class="btn btn-primary" href={reportHref}>Submit battle report</a>
	</footer>
</aside>

<style>
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: block;
		background: radial-gradient(circle at 72% 50%, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.66));
		animation: fade 0.25s ease;
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	.drawer {
		position: fixed;
		top: 0;
		right: 0;
		z-index: 31;
		height: 100%;
		width: min(460px, 100vw);
		background: linear-gradient(180deg, var(--panel-solid), var(--bg-1));
		border-left: 1px solid var(--border-lum);
		box-shadow: -30px 0 80px rgba(0, 0, 0, 0.7);
		display: flex;
		flex-direction: column;
		animation: slide-in 0.32s cubic-bezier(0.16, 1, 0.3, 1);
	}
	@keyframes slide-in {
		from {
			transform: translateX(100%);
		}
	}

	.drawer-scroll {
		flex: 1;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--accent-mid) var(--bg-0);
	}

	/* hero */
	.drawer-hero {
		position: relative;
		padding: 22px 24px 20px;
		border-bottom: 1px solid var(--border);
		overflow: hidden;
	}
	.drawer-hero::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(
			120% 80% at 82% -10%,
			color-mix(in srgb, var(--fcol) 30%, transparent),
			transparent 60%
		);
		pointer-events: none;
	}
	.drawer-close {
		position: absolute;
		top: 14px;
		right: 14px;
		z-index: 2;
	}
	.drawer-close svg {
		width: 15px;
		height: 15px;
	}
	.hero-visual {
		display: flex;
		align-items: center;
		gap: 18px;
		margin-bottom: 14px;
		position: relative;
	}
	.hero-globe {
		flex-shrink: 0;
		line-height: 0;
		filter: drop-shadow(0 0 18px color-mix(in srgb, var(--fcol) 30%, transparent))
			drop-shadow(0 4px 10px rgba(0, 0, 0, 0.6));
	}
	.hero-text {
		min-width: 0;
	}
	.drawer-kicker {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fcol);
		margin-bottom: 7px;
	}
	.drawer-title {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 28px;
		letter-spacing: 0.01em;
		line-height: 1;
		color: var(--text);
		text-wrap: balance;
	}
	.drawer-type {
		font-family: var(--font-display);
		font-weight: 500;
		font-size: 9.5px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-dim);
		margin-top: 9px;
	}
	.drawer-desc {
		font-size: 14px;
		line-height: 1.6;
		color: var(--text-dim);
		position: relative;
		max-width: 62ch;
	}

	/* sections */
	.section {
		padding: 20px 24px;
		border-bottom: 1px solid var(--border);
	}
	.section-label {
		display: flex;
		align-items: center;
		gap: 10px;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-dim);
		margin-bottom: 14px;
	}
	.section-label::before {
		content: '//';
		color: var(--accent);
	}
	.section-label::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border);
	}

	/* control */
	.control-meta {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 4px 12px;
		margin-bottom: 12px;
	}
	.owner-big {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 17px;
		line-height: 1.1;
	}
	.owner-pct {
		font-family: var(--font-body);
		font-size: 12px;
		color: var(--text-dim);
	}
	.split-bar {
		display: flex;
		height: 16px;
		gap: 1px;
		overflow: hidden;
		border: 1px solid var(--border);
		background: var(--bg-0);
	}
	.split-seg {
		height: 100%;
		min-width: 2px;
	}
	.split-empty {
		background: repeating-linear-gradient(
			-45deg,
			transparent,
			transparent 4px,
			var(--border) 4px,
			var(--border) 5px
		);
		min-width: 0;
	}
	.split-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 14px;
		margin-top: 12px;
	}
	.split-key {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-body);
		font-size: 12px;
		color: var(--text-dim);
	}
	.split-key b {
		color: var(--text);
		font-weight: 600;
	}
	.split-key .dot {
		width: 9px;
		height: 9px;
		flex-shrink: 0;
	}

	/* stats */
	.stat-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1px;
		background: var(--border);
		border: 1px solid var(--border);
	}
	.stat-cell {
		background: var(--panel-solid);
		padding: 12px 14px;
	}
	.stat-cell .k {
		font-family: var(--font-display);
		font-weight: 500;
		font-size: 9px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-faint);
		margin-bottom: 6px;
	}
	.stat-cell .v {
		font-family: var(--font-body);
		font-size: 13.5px;
		color: var(--text);
		line-height: 1.25;
	}
	.stat-cell .v.accent {
		color: var(--accent);
	}

	/* battle log */
	.battle {
		display: grid;
		grid-template-columns: 42px 1fr;
		gap: 14px;
		padding: 13px 0;
	}
	.battle + .battle {
		border-top: 1px solid var(--border);
	}
	.battle-turn {
		text-align: center;
	}
	.battle-turn .t-num {
		font-family: var(--font-body);
		font-weight: 600;
		font-size: 19px;
		color: var(--accent);
		line-height: 1;
	}
	.battle-turn .t-lbl {
		font-family: var(--font-display);
		font-weight: 500;
		font-size: 8.5px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-faint);
		margin-top: 3px;
	}
	.battle-main {
		min-width: 0;
	}
	.battle-head {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		margin-bottom: 5px;
	}
	.vs-side {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 11px;
		letter-spacing: 0.04em;
		color: var(--text);
	}
	.vs-side .dot {
		width: 8px;
		height: 8px;
	}
	.vs-x {
		font-family: var(--font-display);
		font-weight: 500;
		font-size: 9.5px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--text-faint);
	}
	.battle-result {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 9px;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		padding: 3px 7px;
		margin-left: auto;
	}
	.res-attacker {
		color: var(--state-attacker);
		background: color-mix(in srgb, var(--state-attacker) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--state-attacker) 35%, transparent);
	}
	.res-defender {
		color: var(--state-defender);
		background: color-mix(in srgb, var(--state-defender) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--state-defender) 35%, transparent);
	}
	.res-stalemate {
		color: var(--state-contested);
		background: color-mix(in srgb, var(--state-contested) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--state-contested) 35%, transparent);
	}
	.battle-sub {
		font-family: var(--font-body);
		font-size: 12.5px;
		color: var(--text-dim);
		line-height: 1.5;
	}
	.battle-meta {
		font-family: var(--font-display);
		font-weight: 500;
		font-size: 9.5px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-faint);
		margin-top: 6px;
	}
	.log-empty {
		font-family: var(--font-body);
		font-size: 13px;
		line-height: 1.55;
		color: var(--text-dim);
		max-width: 60ch;
	}

	/* footer */
	.drawer-foot {
		padding: 15px 24px;
		border-top: 1px solid var(--border-lum);
		background: var(--panel);
		display: flex;
		gap: 10px;
	}
	.drawer-foot .btn {
		flex: 1;
		justify-content: center;
	}

	@media (prefers-reduced-motion: reduce) {
		.drawer,
		.scrim {
			animation: none;
		}
	}

	@media (max-width: 720px) {
		.drawer {
			width: 100vw;
		}
	}
</style>
