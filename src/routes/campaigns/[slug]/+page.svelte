<script lang="ts">
	import { page } from '$app/state';
	import SystemView from '$lib/components/SystemView.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const selectedId = $derived(page.url.searchParams.get('world') ?? undefined);
	const selected = $derived(data.worlds.find((w) => w.id === selectedId));
</script>

<SystemView worlds={data.worlds} {selectedId} />

{#if selected}
	<aside
		class="fixed top-0 right-0 flex h-full w-[420px] max-w-full flex-col border-l p-6"
		style="background: var(--bg-1); border-color: var(--border)"
	>
		<a href="?" class="self-end text-xs uppercase" style="color: var(--text-dim)">Close</a>
		<h2 class="mt-2 font-display text-2xl" style="color: var(--accent)">{selected.name}</h2>
		<p class="text-xs uppercase" style="color: var(--text-dim)">{selected.type}</p>

		<h3 class="mt-6 mb-2 font-display text-sm uppercase">Theatre control</h3>
		{#if selected.shares.length === 0}
			<p class="text-sm" style="color: var(--text-dim)">Unclaimed — no warband holds any share.</p>
		{:else}
			<ul class="flex flex-col gap-1 text-sm">
				{#each selected.shares as share (share.warbandId)}
					<li class="flex justify-between">
						<span>{share.warbandId}</span>
						<span style="color: var(--accent)">{share.share}%</span>
					</li>
				{/each}
			</ul>
		{/if}

		<a
			href="report"
			class="mt-auto p-2 text-center font-display uppercase"
			style="background: var(--accent); color: var(--bg-0)"
		>
			Submit battle report
		</a>
	</aside>
{/if}
