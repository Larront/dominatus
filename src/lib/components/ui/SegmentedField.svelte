<script lang="ts">
	import { RadioGroup } from 'bits-ui';

	type Tone = 'accent' | 'attacker' | 'defender' | 'contested';
	interface Option {
		value: string;
		label: string;
		tone?: Tone;
	}

	let {
		options,
		value = $bindable(''),
		onValueChange = undefined,
		ariaLabel,
		class: klass = ''
	}: {
		options: Option[];
		value?: string;
		onValueChange?: (value: string) => void;
		ariaLabel: string;
		class?: string;
	} = $props();

	const item =
		'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-panel-2 font-display font-semibold ' +
		'text-[11px] uppercase tracking-[0.06em] text-ink-dim cursor-pointer whitespace-nowrap ' +
		'transition-[color,background-color,box-shadow] duration-[140ms] hover:text-ink ' +
		'focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--color-accent)]';

	// Selected styling per tone (full static class strings so Tailwind keeps them).
	const checked: Record<Tone, string> = {
		accent:
			'data-[state=checked]:text-accent data-[state=checked]:bg-accent-soft data-[state=checked]:shadow-[inset_0_0_0_1px_var(--color-accent-mid)]',
		attacker:
			'data-[state=checked]:text-state-attacker data-[state=checked]:bg-state-attacker-soft data-[state=checked]:shadow-[inset_0_0_0_1px_var(--color-state-attacker-line)]',
		defender:
			'data-[state=checked]:text-state-defender data-[state=checked]:bg-state-defender-soft data-[state=checked]:shadow-[inset_0_0_0_1px_var(--color-state-defender-line)]',
		contested:
			'data-[state=checked]:text-state-contested data-[state=checked]:bg-state-contested-soft data-[state=checked]:shadow-[inset_0_0_0_1px_var(--color-state-contested-line)]'
	};
</script>

<RadioGroup.Root
	{value}
	onValueChange={(v) => {
		value = v;
		onValueChange?.(v);
	}}
	aria-label={ariaLabel}
	class="flex gap-px border border-border bg-border {klass}"
>
	{#each options as opt (opt.value)}
		<RadioGroup.Item value={opt.value} class="{item} {checked[opt.tone ?? 'accent']}">
			{opt.label}
		</RadioGroup.Item>
	{/each}
</RadioGroup.Root>
