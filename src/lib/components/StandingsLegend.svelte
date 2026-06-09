<script lang="ts">
	import { Collapsible } from 'bits-ui';

	interface Standing {
		id: string;
		name: string;
		short: string;
		color: string;
		held: number;
		you: boolean;
	}

	let { standings }: { standings: Standing[] } = $props();

	let open = $state(true);
</script>

<Collapsible.Root
	bind:open
	class="absolute bottom-5 left-5 z-[6] w-64 overflow-hidden border border-border bg-[color-mix(in_srgb,var(--color-panel)_86%,transparent)] backdrop-blur-[8px]
		before:absolute before:inset-x-0 before:top-0 before:z-[1] before:h-0.5 before:bg-[linear-gradient(90deg,var(--color-accent),transparent_70%)] before:opacity-70 before:content-['']"
>
	<Collapsible.Trigger
		class="flex w-full items-center justify-between gap-2.5 bg-transparent px-3.5 py-3 font-display text-[10.5px]
			font-semibold tracking-[0.14em] text-ink-dim uppercase transition-colors duration-[120ms]
			hover:text-accent focus-visible:text-accent focus-visible:outline-none"
	>
		<span class="before:text-accent before:content-['▸_']">Warband Standings</span>
		<svg
			class="size-[13px] shrink-0 text-accent transition-transform duration-200 {open ? '' : '-rotate-90'}"
			viewBox="0 0 14 14"
			aria-hidden="true"
		>
			<path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" />
		</svg>
	</Collapsible.Trigger>

	<Collapsible.Content class="px-3.5 pb-3">
		<div
			class="mb-1 flex justify-between border-b border-border pb-2 font-display text-[9px] font-medium
				tracking-[0.12em] text-ink-faint uppercase"
		>
			<span>Warband</span>
			<span>Worlds</span>
		</div>
		{#each standings as wb (wb.id)}
			<div
				class="grid grid-cols-[12px_1fr_auto] items-center gap-2.5 py-[7px] font-body text-[13px]
					[&+&]:border-t [&+&]:border-border"
			>
				<span class="size-[11px] shadow-[0_0_8px_currentColor]" style="color: {wb.color}; background: {wb.color}"></span>
				<span class="flex min-w-0 items-center gap-1.5 leading-[1.2] text-ink">
					{wb.name}
					{#if wb.you}
						<span class="border border-accent-mid px-1 py-0.5 font-display text-[8.5px] font-semibold tracking-[0.08em] text-accent uppercase">
							You
						</span>
					{/if}
				</span>
				<span class="font-body text-[15px] leading-none font-semibold text-accent">{wb.held}</span>
			</div>
		{:else}
			<p class="font-body text-[12px] leading-normal text-ink-dim">No warbands have mustered yet.</p>
		{/each}
	</Collapsible.Content>
</Collapsible.Root>
