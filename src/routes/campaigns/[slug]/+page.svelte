<script lang="ts">
	import { page } from '$app/state';
	import SystemView from '$lib/components/SystemView.svelte';
	import WorldDrawer from '$lib/components/WorldDrawer.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const base = $derived(`/campaigns/${page.params.slug}`);
	const selectedId = $derived(page.url.searchParams.get('world') ?? undefined);
	const selected = $derived(data.worlds.find((w) => w.id === selectedId));
	const worldLog = $derived(
		selected ? data.battleLog.filter((b) => b.worldId === selected.id) : []
	);
</script>

<SystemView
	worlds={data.worlds}
	warbands={data.warbands}
	standings={data.standings}
	{selectedId}
	campaignName={data.campaign.name}
	basePath={base}
/>

{#if selected}
	<WorldDrawer
		world={selected}
		warbands={data.warbands}
		battleLog={worldLog}
		closeHref={base}
		reportHref="{base}/report"
	/>
{/if}
