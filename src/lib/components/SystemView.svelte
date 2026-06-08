<script lang="ts">
	import Planet from './Planet.svelte';
	import type { WorldWithControl } from '$lib/domain/world';

	// Structural placeholder layout. The real system-view design is deferred — this
	// just lays out the worlds and selects one via the ?world= query param.
	let { worlds, selectedId }: { worlds: WorldWithControl[]; selectedId?: string } = $props();
</script>

<div class="flex flex-wrap items-center justify-center gap-10 p-10">
	{#each worlds as world (world.id)}
		<a
			href="?world={world.id}"
			class="flex flex-col items-center gap-2"
			class:opacity-100={selectedId === world.id}
			aria-current={selectedId === world.id ? 'true' : undefined}
		>
			<Planet render={world.render} name={world.name} size={112} />
			<span class="font-display text-sm">{world.name}</span>
			<span class="text-xs" style="color: var(--text-dim)">
				{#if world.derived.unclaimed}
					Unclaimed
				{:else if world.derived.contested}
					Contested
				{:else}
					Held
				{/if}
			</span>
		</a>
	{/each}

	{#if worlds.length === 0}
		<p style="color: var(--text-dim)">No worlds in this system yet.</p>
	{/if}
</div>
