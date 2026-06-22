<script lang="ts">
	import type { PageData } from './$types';
	import type { ChronicleWarband } from '$lib/domain/chronicle';

	let { data }: { data: PageData } = $props();

	// Every campaign has at least the cycle-1 opening divider; show the empty state until a real
	// record (battle, award, muster) lands.
	const hasRecords = $derived(data.events.some((e) => e.type !== 'cycle-advanced'));

	const kindLabel: Record<string, string> = {
		unit: 'a unit',
		character: 'a character / vehicle',
		terrain: 'a terrain / display piece'
	};

	const outcomeLabel: Record<string, string> = {
		attacker: 'Attacker victory',
		defender: 'Defender victory',
		stalemate: 'Stalemate'
	};
</script>

<!-- A warband chip: colour swatch + short tag, dimmed unless it's the battle's victor. -->
{#snippet chip(wb: ChronicleWarband, won: boolean)}
	<span
		class="inline-flex items-center gap-1.5 border px-2 py-1 font-display text-[11px] font-semibold tracking-[0.06em] whitespace-nowrap uppercase {won
			? 'border-accent-mid bg-accent-soft text-accent'
			: 'border-border bg-panel-2 text-ink-dim'}"
		title={wb.name}
	>
		<span class="size-2 shrink-0" style="background: {wb.color}"></span>
		{wb.short}
	</span>
{/snippet}

<main class="mx-auto w-full max-w-3xl px-6 py-8 max-[720px]:px-4">
	<header class="mb-8">
		<h1 class="font-display text-2xl font-bold tracking-[0.02em] text-accent">Chronicle</h1>
		<p class="mt-1 font-body text-[13px] leading-[1.5] text-ink-dim">
			The campaign as it unfolds — battles fought, worlds won and lost, painting honours, warbands
			mustered, and the cycles turning. Newest first.
		</p>
	</header>

	{#if !hasRecords}
		<p
			class="border border-border bg-[color-mix(in_srgb,var(--color-panel)_70%,transparent)] px-4 py-10 text-center font-body text-[13px] text-ink-dim"
		>
			Nothing has happened yet. Once warbands muster and battles are fought, their story appears
			here.
		</p>
	{:else}
		<ol class="flex flex-col">
			{#each data.events as event (event.type + ':' + (event.type === 'cycle-advanced' ? event.cycle : event.id))}
				{#if event.type === 'cycle-advanced'}
					<!-- Cycle divider: the section header for everything below it, until the next divider. -->
					<li
						class="mt-7 mb-3 flex items-center gap-3 first:mt-0 max-[720px]:mt-6"
						aria-label="Cycle {event.cycle}"
					>
						<span
							class="font-display text-[11px] font-semibold tracking-[0.16em] whitespace-nowrap text-accent uppercase"
						>
							{event.opening ? 'Cycle 1 · Campaign opens' : `Cycle ${event.cycle}`}
						</span>
						<span
							class="h-px flex-1 bg-[linear-gradient(90deg,var(--color-border-lum),transparent)]"
						></span>
					</li>
				{:else}
					<li
						class="flex gap-3 border-l border-border py-2.5 pl-4 max-[720px]:gap-2.5 max-[720px]:pl-3.5"
					>
						<!-- Marker dot sitting on the rail. -->
						<span
							class="mt-[7px] -ml-[21px] size-2 shrink-0 rounded-full bg-accent shadow-[0_0_6px_var(--color-accent-glow)] max-[720px]:-ml-[18px]"
							aria-hidden="true"
						></span>

						<div class="min-w-0 flex-1">
							{#if event.type === 'battle-fought'}
								<p
									class="font-display text-[10px] font-semibold tracking-[0.12em] text-ink-faint uppercase"
								>
									Battle · <span class="text-ink-dim">{event.worldName}</span>
								</p>
								<div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-2">
									{#each event.attackers as wb (wb.id)}
										{@render chip(wb, event.outcome === 'attacker')}
									{/each}
									<span class="font-display text-[10px] tracking-[0.1em] text-ink-faint uppercase"
										>vs</span
									>
									{#each event.defenders as wb (wb.id)}
										{@render chip(wb, event.outcome === 'defender')}
									{/each}
								</div>
								<p
									class="mt-2 font-body text-[12px] {event.outcome === 'stalemate'
										? 'text-ink-dim'
										: 'text-ink'}"
								>
									{outcomeLabel[event.outcome]}
								</p>
							{:else if event.type === 'painting-award'}
								<p
									class="font-display text-[10px] font-semibold tracking-[0.12em] text-ink-faint uppercase"
								>
									Painting award
								</p>
								<p class="mt-1.5 font-body text-[13px] leading-[1.5] text-ink">
									<span
										class="inline-flex items-center gap-1.5 align-middle font-display text-[11px] font-semibold tracking-[0.06em] uppercase"
										title={event.warband.name}
									>
										<span class="size-2 shrink-0" style="background: {event.warband.color}"></span>
										{event.warband.short}
									</span>
									<span class="text-ink-dim">
										earned a painting award for {kindLabel[event.kind]}</span
									>
									{#if event.note}<span class="text-ink-faint">— {event.note}</span>{/if}
								</p>
							{:else if event.type === 'warband-mustered'}
								<p
									class="font-display text-[10px] font-semibold tracking-[0.12em] text-ink-faint uppercase"
								>
									Muster
								</p>
								<p class="mt-1.5 font-body text-[13px] leading-[1.5] text-ink">
									<span class="font-semibold" style="color: {event.warband.color}"
										>{event.warband.name}</span
									>
									<span class="text-ink-dim"> mustered into the campaign.</span>
								</p>
							{:else if event.type === 'control-shift'}
								<p
									class="font-display text-[10px] font-semibold tracking-[0.12em] text-ink-faint uppercase"
								>
									Control · <span class="text-ink-dim">{event.worldName}</span>
								</p>
								<p class="mt-1.5 font-body text-[13px] leading-[1.5] text-ink-dim">
									{#if event.kind === 'seized' && event.owner}
										<span class="font-semibold" style="color: {event.owner.color}"
											>{event.owner.name}</span
										> seized control of the world.
									{:else if event.kind === 'wrested' && event.owner && event.previous}
										<span class="font-semibold" style="color: {event.owner.color}"
											>{event.owner.name}</span
										>
										wrested the world from
										<span class="font-semibold" style="color: {event.previous.color}"
											>{event.previous.name}</span
										>.
									{:else if event.kind === 'lost' && event.previous}
										<span class="font-semibold" style="color: {event.previous.color}"
											>{event.previous.name}</span
										> lost its hold; the world is now contested.
									{/if}
								</p>
							{/if}
						</div>
					</li>
				{/if}
			{/each}
		</ol>
	{/if}
</main>
