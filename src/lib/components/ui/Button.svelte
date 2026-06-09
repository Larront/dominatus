<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'default' | 'primary' | 'ghost';

	let {
		variant = 'default',
		icon = false,
		href = undefined,
		type = 'button',
		disabled = false,
		class: klass = '',
		children,
		...rest
	}: {
		variant?: Variant;
		icon?: boolean;
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		class?: string;
		children: Snippet;
		[key: string]: unknown;
	} = $props();

	// The shared console button: hard corners, label type, one accent (DESIGN §5).
	const base =
		'inline-flex items-center justify-center gap-2 border font-display font-semibold uppercase whitespace-nowrap cursor-pointer no-underline tracking-[0.09em] ' +
		'transition-[color,background-color,border-color,box-shadow] duration-[120ms] ' +
		'active:translate-y-px motion-reduce:active:translate-y-0 focus-visible:outline-none ' +
		'disabled:opacity-60 disabled:cursor-not-allowed [&_svg]:size-[15px]';
	const variants: Record<Variant, string> = {
		default:
			'border-border bg-panel-2 text-ink-dim hover:text-accent hover:border-border-lum hover:bg-accent-soft hover:shadow-[inset_0_0_0_1px_var(--color-accent-mid)] focus-visible:text-accent focus-visible:border-accent focus-visible:shadow-[0_0_0_1px_var(--color-accent-mid)]',
		ghost:
			'border-border bg-transparent text-ink-dim hover:text-accent hover:border-border-lum hover:bg-accent-soft focus-visible:text-accent focus-visible:border-accent focus-visible:shadow-[0_0_0_1px_var(--color-accent-mid)]',
		primary:
			'border-accent bg-accent text-void font-bold shadow-[0_0_16px_var(--color-accent-soft)] hover:bg-accent-ink hover:shadow-[0_0_22px_var(--color-accent-glow)] focus-visible:shadow-[0_0_0_2px_var(--color-accent-mid),0_0_16px_var(--color-accent-soft)]'
	};
	const cls = $derived(
		`${base} ${icon ? 'size-[38px] p-2.5' : 'px-3.5 py-2.5 text-[11px]'} ${variants[variant]} ${klass}`
	);
</script>

{#if href}
	<a {href} class={cls} {...rest}>{@render children()}</a>
{:else}
	<button {type} {disabled} class={cls} {...rest}>{@render children()}</button>
{/if}
