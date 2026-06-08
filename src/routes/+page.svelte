<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<main class="mx-auto max-w-3xl p-8">
	<h1 class="font-display text-3xl" style="color: var(--accent)">Dominatus</h1>
	<p class="mt-1 text-sm" style="color: var(--text-dim)">Campaign command</p>

	<h2 class="mt-8 mb-3 font-display text-lg">Your campaigns</h2>
	{#if data.campaigns.length === 0}
		<p style="color: var(--text-dim)">You are not part of any campaigns yet.</p>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each data.campaigns as campaign (campaign.id)}
				<li>
					<a
						href="/campaigns/{campaign.slug}"
						class="flex items-center justify-between border p-4"
						style="border-color: var(--border)"
					>
						<span class="font-display">{campaign.name}</span>
						<span class="text-xs uppercase" style="color: var(--text-dim)">
							{campaign.role} · cycle {campaign.currentCycle}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</main>
