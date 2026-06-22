<script lang="ts">
	import { page } from '$app/state';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const kindLabel: Record<string, string> = {
		unit: 'Unit',
		character: 'Character / vehicle',
		terrain: 'Terrain / display'
	};

	// The distinct warbands with at least one photo, in name order — the filter's options. Derived
	// from the images themselves so a warband only appears once it has something to show.
	const warbands = $derived.by(() => {
		const byId = new Map<string, { id: string; name: string; short: string; color: string }>();
		for (const img of data.images) {
			if (!byId.has(img.warbandId)) {
				byId.set(img.warbandId, {
					id: img.warbandId,
					name: img.warbandName,
					short: img.warbandShort,
					color: img.warbandColor
				});
			}
		}
		return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
	});

	// The filter is an override over the URL's `?warband=` deep link (set by chronicle/stat-block
	// thumbnails), which itself falls back to "all". A stale param — or one whose warband has no
	// photos — reads as "all" rather than an empty grid.
	let selectedOverride = $state<string | null>(null);
	const fromUrl = $derived(page.url.searchParams.get('warband'));
	const selected = $derived(
		selectedOverride ?? (fromUrl && warbands.some((w) => w.id === fromUrl) ? fromUrl : 'all')
	);

	const filtered = $derived(
		selected === 'all' ? data.images : data.images.filter((img) => img.warbandId === selected)
	);

	const chip =
		'border px-2.5 py-1 font-display text-[10px] font-semibold tracking-[0.08em] uppercase transition-[color,border-color,background-color] duration-[120ms]';
</script>

<main class="mx-auto w-full max-w-5xl px-6 py-8 max-[720px]:px-4">
	<header class="mb-6">
		<h1 class="font-display text-2xl font-bold tracking-[0.02em] text-accent">Gallery</h1>
		<p class="mt-1 font-body text-[13px] leading-[1.5] text-ink-dim">
			The campaign's painted models — every painting award with a photo. Filter by warband to see a
			single force's work.
		</p>
	</header>

	{#if data.images.length === 0}
		<p
			class="border border-border bg-[color-mix(in_srgb,var(--color-panel)_70%,transparent)] px-4 py-10 text-center font-body text-[13px] text-ink-dim"
		>
			No painted-models photos yet. Once an award carries a photo, it appears here.
		</p>
	{:else}
		<!-- Warband filter: "All" plus a chip per warband that has photos. -->
		<div class="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter by warband">
			<button
				type="button"
				onclick={() => (selectedOverride = 'all')}
				aria-pressed={selected === 'all'}
				class="{chip} {selected === 'all'
					? 'border-accent-mid bg-accent-soft text-accent'
					: 'border-border bg-panel-2 text-ink-dim hover:text-accent'}"
			>
				All
			</button>
			{#each warbands as wb (wb.id)}
				<button
					type="button"
					onclick={() => (selectedOverride = wb.id)}
					aria-pressed={selected === wb.id}
					title={wb.name}
					class="{chip} inline-flex items-center gap-1.5 {selected === wb.id
						? 'border-accent-mid bg-accent-soft text-accent'
						: 'border-border bg-panel-2 text-ink-dim hover:text-accent'}"
				>
					<span class="size-2 shrink-0" style="background: {wb.color}"></span>
					{wb.short}
				</button>
			{/each}
		</div>

		<ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
			{#each filtered as img (img.id)}
				{@const src = `/campaigns/${data.slug}/award/image/${img.imagePath}`}
				<li class="flex flex-col border border-border bg-panel-2/60">
					<a href={src} target="_blank" rel="noopener" class="block">
						<img
							{src}
							alt="Painted models — {img.warbandName}{img.note ? `, ${img.note}` : ''}"
							loading="lazy"
							class="aspect-square w-full border-b border-border object-cover"
						/>
					</a>
					<div class="flex min-w-0 flex-col gap-1 p-3">
						<span
							class="inline-flex items-center gap-1.5 font-display text-[11px] font-semibold tracking-[0.06em] uppercase"
							title={img.warbandName}
						>
							<span class="size-2 shrink-0" style="background: {img.warbandColor}"></span>
							<span class="truncate text-ink">{img.warbandName}</span>
						</span>
						<span class="font-body text-[12px] text-ink-dim">{kindLabel[img.kind] ?? img.kind}</span
						>
						{#if img.note}
							<span class="font-body text-[12px] leading-[1.4] text-ink-faint">{img.note}</span>
						{/if}
						<span
							class="mt-0.5 font-display text-[9.5px] tracking-[0.12em] text-ink-faint uppercase"
						>
							Cycle {img.cycle}
						</span>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</main>
