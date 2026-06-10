<script lang="ts">
	import { goto } from '$app/navigation';
	import Planet from './Planet.svelte';
	import Button from './ui/Button.svelte';
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
	const color = (id: string) => byId.get(id)?.color ?? 'var(--color-ink-dim)';

	const segments = $derived(
		[...world.shares].filter((s) => s.share > 0).sort((a, b) => b.share - a.share)
	);
	const heldTotal = $derived(segments.reduce((sum, s) => sum + s.share, 0));
	const unclaimedShare = $derived(Math.max(0, 100 - heldTotal));

	const owner = $derived(world.derived.owner ? wb(world.derived.owner) : null);
	const leader = $derived(world.derived.leader ? wb(world.derived.leader) : null);
	const leaderShare = $derived(segments[0]?.share ?? 0);
	const ownerColor = $derived(
		world.derived.contested
			? 'var(--color-state-contested)'
			: (owner?.color ?? 'var(--color-ink-dim)')
	);

	const outcomeMeta = {
		attacker: {
			label: 'Attacker won',
			cls: 'text-state-attacker bg-state-attacker-soft border-state-attacker-line'
		},
		defender: {
			label: 'Defender held',
			cls: 'text-state-defender bg-state-defender-soft border-state-defender-line'
		},
		stalemate: {
			label: 'Stalemate',
			cls: 'text-state-contested bg-state-contested-soft border-state-contested-line'
		}
	} as const;

	// Escape closes the panel; selection lives in the URL so it stays shareable.
	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') goto(closeHref, { keepFocus: false });
	}

	const sectionLabel =
		"flex items-center gap-2.5 font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-dim mb-3.5 before:content-['//'] before:text-accent after:content-[''] after:flex-1 after:h-px after:bg-border";
</script>

<svelte:window onkeydown={onKey} />

<a
	class="fixed inset-0 z-30 block animate-scrim-in bg-[radial-gradient(circle_at_72%_50%,rgba(0,0,0,0.3),rgba(0,0,0,0.66))] motion-reduce:animate-none"
	href={closeHref}
	aria-label="Close world intel"
></a>

<aside
	class="fixed top-0 right-0 z-[31] flex h-full w-[min(460px,100vw)] animate-drawer-in flex-col border-l border-border-lum bg-[linear-gradient(180deg,var(--color-panel-solid),var(--color-panel))] shadow-[-30px_0_80px_rgba(0,0,0,0.7)] motion-reduce:animate-none max-[720px]:w-screen"
	aria-label="{world.name} intel"
>
	<header
		class="relative overflow-hidden border-b border-border px-6 pt-[22px] pb-5 before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(120%_80%_at_82%_-10%,color-mix(in_srgb,var(--fcol)_30%,transparent),transparent_60%)] before:content-['']"
		style="--fcol: {ownerColor}"
	>
		<Button icon href={closeHref} aria-label="Close" class="absolute top-3.5 right-3.5 z-[2]">
			<svg viewBox="0 0 16 16" aria-hidden="true">
				<path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" stroke-width="1.6" />
			</svg>
		</Button>
		<div class="relative mb-3.5 flex items-center gap-[18px]">
			<div
				class="shrink-0 leading-[0] [filter:drop-shadow(0_0_18px_color-mix(in_srgb,var(--fcol)_30%,transparent))_drop-shadow(0_4px_10px_rgba(0,0,0,0.6))]"
			>
				<Planet render={world.render} size={104} resolution={110} name={world.name} />
			</div>
			<div class="min-w-0">
				<p
					class="mb-[7px] font-display text-[10px] font-semibold tracking-[0.14em] [color:var(--fcol)] uppercase"
				>
					{#if world.derived.unclaimed}
						Unclaimed Territory
					{:else if world.derived.contested}
						Contested · No Majority
					{:else}
						Held · {owner?.name}
					{/if}
				</p>
				<h2
					class="font-display text-[28px] leading-none font-bold tracking-[0.01em] text-balance text-ink"
				>
					{world.name}
				</h2>
				<p
					class="mt-[9px] font-display text-[9.5px] font-medium tracking-[0.1em] text-ink-dim uppercase"
				>
					{world.type}{world.value ? ` · ${world.value}` : ''}
				</p>
			</div>
		</div>
		{#if world.description}
			<p class="relative max-w-[62ch] font-prose text-[14px] leading-[1.6] text-ink-dim">
				{world.description}
			</p>
		{/if}
	</header>

	<div
		class="flex-1 [scrollbar-width:thin] [scrollbar-color:var(--color-accent-mid)_var(--color-void)] overflow-y-auto"
	>
		<section class="border-b border-border px-6 py-5">
			<h3 class={sectionLabel}>Control</h3>
			<div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
				<span
					class="font-display text-[17px] leading-[1.1] font-semibold"
					style="color: {ownerColor}"
				>
					{#if world.derived.unclaimed}Unclaimed{:else if world.derived.contested}Contested{:else}{owner?.name}{/if}
				</span>
				{#if !world.derived.unclaimed && leader}
					<span class="font-body text-[12px] text-ink-dim"
						>{leader.name} leads at {leaderShare}%</span
					>
				{/if}
			</div>

			<div
				class="flex h-4 gap-px overflow-hidden border border-border bg-void"
				role="img"
				aria-label={segments.map((s) => `${name(s.warbandId)} ${s.share}%`).join(', ') ||
					'No control held'}
			>
				{#each segments as seg (seg.warbandId)}
					<span
						class="h-full min-w-0.5"
						style="flex: {seg.share}; background: {color(seg.warbandId)}"
					></span>
				{/each}
				{#if unclaimedShare > 0}
					<span
						class="h-full min-w-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_4px,var(--color-border)_4px,var(--color-border)_5px)]"
						style="flex: {unclaimedShare}"
					></span>
				{/if}
			</div>

			{#if segments.length > 0}
				<div class="mt-3 flex flex-wrap gap-x-3.5 gap-y-2">
					{#each segments as seg (seg.warbandId)}
						<span class="flex items-center gap-1.5 font-body text-[12px] text-ink-dim">
							<span class="size-[9px] shrink-0" style="background: {color(seg.warbandId)}"></span>
							{name(seg.warbandId)}
							<b class="font-semibold text-ink">{seg.share}%</b>
						</span>
					{/each}
				</div>
			{/if}
		</section>

		<section class="border-b border-border px-6 py-5">
			<h3 class={sectionLabel}>System Intel</h3>
			<div class="grid grid-cols-2 gap-px border border-border bg-border">
				{#each [{ k: 'Classification', v: world.type, accent: false }, { k: 'Strategic Value', v: world.value ?? 'Unrated', accent: true }, { k: 'Garrison', v: world.garrison ?? 'Unknown', accent: false }, { k: 'Supply Lines', v: world.supply ?? 'Unknown', accent: false }] as cell (cell.k)}
					<div class="bg-panel-solid px-3.5 py-3">
						<div
							class="mb-1.5 font-display text-[9px] font-medium tracking-[0.1em] text-ink-faint uppercase"
						>
							{cell.k}
						</div>
						<div
							class="font-body text-[13.5px] leading-[1.25] {cell.accent
								? 'text-accent'
								: 'text-ink'}"
						>
							{cell.v}
						</div>
					</div>
				{/each}
			</div>
		</section>

		{#if world.effects.length}
			<section class="border-b border-border px-6 py-5">
				<h3 class={sectionLabel}>Planetary Effects</h3>
				<ul class="flex flex-col gap-3">
					{#each world.effects as effect (effect.id)}
						<li>
							<p
								class="font-display text-[12px] font-semibold tracking-[0.05em] text-accent uppercase"
							>
								{effect.title}
							</p>
							{#if effect.description}
								<p class="mt-1 font-body text-[12.5px] leading-[1.5] text-ink-dim">
									{effect.description}
								</p>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="border-b border-border px-6 py-5">
			<h3 class={sectionLabel}>Battle Log</h3>
			{#if battleLog.length === 0}
				<p class="max-w-[60ch] font-body text-[13px] leading-[1.55] text-ink-dim">
					No battles logged over {world.name} yet. The first report filed here will appear in this ledger.
				</p>
			{:else}
				<div>
					{#each battleLog as report (report.id)}
						{@const meta = outcomeMeta[report.outcome]}
						<article
							class="grid grid-cols-[42px_1fr] gap-3.5 py-[13px] [&+&]:border-t [&+&]:border-border"
						>
							<div class="text-center">
								<div class="font-body text-[19px] leading-none font-semibold text-accent">
									{report.cycle}
								</div>
								<div
									class="mt-[3px] font-display text-[8.5px] font-medium tracking-[0.1em] text-ink-faint uppercase"
								>
									Cycle
								</div>
							</div>
							<div class="min-w-0">
								<div class="mb-[5px] flex flex-wrap items-center gap-2">
									<span
										class="inline-flex items-center gap-1.5 font-display text-[11px] font-semibold tracking-[0.04em] text-ink"
									>
										{#each report.attackers as c (c.warbandId)}
											<span class="size-2" style="background: {color(c.warbandId)}"></span>
											{wb(c.warbandId)?.short ?? '??'}
										{/each}
									</span>
									<span
										class="font-display text-[9.5px] font-medium tracking-[0.1em] text-ink-faint uppercase"
										>vs</span
									>
									<span
										class="inline-flex items-center gap-1.5 font-display text-[11px] font-semibold tracking-[0.04em] text-ink"
									>
										{#each report.defenders as c (c.warbandId)}
											<span class="size-2" style="background: {color(c.warbandId)}"></span>
											{wb(c.warbandId)?.short ?? '??'}
										{/each}
									</span>
									<span
										class="ml-auto border px-[7px] py-[3px] font-display text-[9px] font-semibold tracking-[0.05em] uppercase {meta.cls}"
										>{meta.label}</span
									>
								</div>
								{#if report.narrative}
									<p class="font-body text-[12.5px] leading-[1.5] text-ink-dim">
										{report.narrative}
									</p>
								{/if}
								{#if report.pointsSize}
									<p
										class="mt-1.5 font-display text-[9.5px] font-medium tracking-[0.06em] text-ink-faint uppercase"
									>
										{report.pointsSize} pts engagement
									</p>
								{/if}
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	</div>

	<footer class="flex gap-2.5 border-t border-border-lum bg-panel px-6 py-[15px]">
		<Button variant="primary" href={reportHref} class="flex-1">Submit battle report</Button>
	</footer>
</aside>
