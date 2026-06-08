<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const slug = $derived(page.params.slug);
	const base = $derived(`/campaigns/${slug}`);

	const nav = $derived([
		{ href: base, label: 'Map' },
		{ href: `${base}/report`, label: 'Report' },
		{ href: `${base}/rules`, label: 'Rules' },
		{ href: `${base}/account`, label: 'Account' }
	]);
</script>

<div class="flex min-h-screen flex-col">
	<header class="flex items-center gap-6 border-b px-6 py-3" style="border-color: var(--border)">
		<a href="/" class="font-display text-lg" style="color: var(--accent)">{data.campaign.name}</a>
		<span class="text-xs uppercase" style="color: var(--text-dim)">
			Cycle {data.campaign.currentCycle} · {data.role}
		</span>
		<nav class="ml-auto flex gap-1">
			{#each nav as item (item.href)}
				<a
					href={item.href}
					class="px-3 py-2 font-display text-xs uppercase"
					class:text-[color:var(--accent)]={page.url.pathname === item.href}
					style="color: var(--text-dim)"
				>
					{item.label}
				</a>
			{/each}
		</nav>
	</header>

	<main class="flex-1">
		{@render children()}
	</main>
</div>
