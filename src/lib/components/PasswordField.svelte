<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	// A password input with a show/hide toggle, styled to match the auth terminal's fields.
	// Each instance owns its own reveal state, so the password and confirm-password fields
	// toggle independently.
	interface Props {
		value: string;
		label: string;
		autocomplete?: HTMLInputAttributes['autocomplete'];
		minlength?: number;
	}

	let { value = $bindable(), label, autocomplete, minlength }: Props = $props();
	let show = $state(false);

	const labelCls = 'font-display text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-dim';
	// Mirrors AccessGate's `field`, with extra right padding to clear the toggle button.
	const fieldCls =
		'w-full bg-void border border-border pl-[11px] pr-10 py-2.5 font-body text-[13px] text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent-mid),0_0_14px_var(--color-accent-soft)]';
</script>

<label class="flex flex-col gap-1.5">
	<span class={labelCls}>{label}</span>
	<div class="relative">
		<input
			type={show ? 'text' : 'password'}
			bind:value
			required
			{autocomplete}
			{minlength}
			class={fieldCls}
		/>
		<button
			type="button"
			onclick={() => (show = !show)}
			aria-label={show ? 'Hide password' : 'Show password'}
			aria-pressed={show}
			class="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-ink-faint transition-colors duration-150 hover:text-accent focus-visible:text-accent focus-visible:outline-none"
		>
			{#if show}
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
					<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68" />
					<path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.39-1.61" />
					<line x1="2" x2="22" y1="2" y2="22" />
				</svg>
			{:else}
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
					<circle cx="12" cy="12" r="3" />
				</svg>
			{/if}
		</button>
	</div>
</label>
