<script lang="ts">
	import { Checkbox } from 'bits-ui';

	let {
		checked = $bindable(false),
		onCheckedChange = undefined,
		label,
		hint = undefined,
		class: klass = ''
	}: {
		checked?: boolean;
		onCheckedChange?: (checked: boolean) => void;
		label: string;
		hint?: string;
		class?: string;
	} = $props();
</script>

<Checkbox.Root
	{checked}
	onCheckedChange={(v) => {
		checked = v;
		onCheckedChange?.(v);
	}}
	class="group inline-flex cursor-pointer items-center gap-2 font-display text-[10px] font-semibold tracking-[0.1em] text-ink-dim uppercase transition-colors hover:text-ink focus-visible:outline-none {klass}"
>
	{#snippet children({ checked: on })}
		<span
			class="grid size-[15px] shrink-0 place-items-center border text-void transition-colors {on
				? 'border-accent bg-accent'
				: 'border-border bg-void group-focus-visible:border-accent'}"
		>
			{#if on}
				<svg viewBox="0 0 12 12" class="size-3" aria-hidden="true">
					<path d="M2.5 6.5l2.5 2.5 5-6" fill="none" stroke="currentColor" stroke-width="1.8" />
				</svg>
			{/if}
		</span>
		{label}{#if hint}<span class="text-ink-faint">{hint}</span>{/if}
	{/snippet}
</Checkbox.Root>
