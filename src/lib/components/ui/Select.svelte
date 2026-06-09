<script lang="ts">
	import { Select } from 'bits-ui';

	interface Item {
		value: string;
		label: string;
	}

	let {
		items,
		value = $bindable(''),
		onValueChange = undefined,
		placeholder = 'Select…',
		ariaLabel = undefined,
		/** Optional leading swatch colour (e.g. a warband's faction colour). */
		leadColor = undefined,
		disabled = false,
		class: klass = ''
	}: {
		items: Item[];
		value?: string;
		onValueChange?: (value: string) => void;
		placeholder?: string;
		ariaLabel?: string;
		leadColor?: string;
		disabled?: boolean;
		class?: string;
	} = $props();

	const selectedLabel = $derived(items.find((i) => i.value === value)?.label);
</script>

<Select.Root
	type="single"
	{items}
	{value}
	onValueChange={(v) => {
		value = v;
		onValueChange?.(v);
	}}
	{disabled}
>
	<Select.Trigger
		aria-label={ariaLabel}
		class="relative flex w-full items-center gap-2 border border-border bg-void py-2.5 pr-8 pl-3 font-body text-[13px]
			text-ink transition-[border-color,box-shadow] duration-[120ms]
			focus-visible:border-accent focus-visible:shadow-[0_0_0_1px_var(--color-accent-mid),0_0_14px_var(--color-accent-soft)]
			focus-visible:outline-none disabled:opacity-60 {klass}"
	>
		{#if leadColor}
			<span class="size-2 shrink-0" style="background: {leadColor}"></span>
		{/if}
		<span class="truncate {selectedLabel ? 'text-ink' : 'text-ink-faint'}">
			{selectedLabel ?? placeholder}
		</span>
		<span
			class="pointer-events-none absolute top-1/2 right-3 -mt-[5px] size-2 rotate-45 border-r border-b border-ink-dim"
			aria-hidden="true"
		></span>
	</Select.Trigger>

	<Select.Portal>
		<Select.Content
			sideOffset={4}
			class="z-50 max-h-64 w-[var(--bits-select-anchor-width)] overflow-y-auto border border-border-lum
				bg-panel-solid py-1 shadow-[0_24px_60px_rgba(0,0,0,0.7)]"
		>
			<Select.Viewport>
				{#each items as item (item.value)}
					<Select.Item
						value={item.value}
						label={item.label}
						class="flex cursor-pointer items-center justify-between px-3 py-2 font-body text-[13px] text-ink-dim
							data-highlighted:bg-accent-soft data-highlighted:text-accent data-selected:text-accent"
					>
						{#snippet children({ selected })}
							<span class="truncate">{item.label}</span>
							{#if selected}<span class="text-accent" aria-hidden="true">✓</span>{/if}
						{/snippet}
					</Select.Item>
				{/each}
			</Select.Viewport>
		</Select.Content>
	</Select.Portal>
</Select.Root>
