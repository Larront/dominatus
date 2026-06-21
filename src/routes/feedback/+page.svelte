<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import Button from '$lib/components/ui/Button.svelte';
	import BrandMark from '$lib/components/BrandMark.svelte';
	import SegmentedField from '$lib/components/ui/SegmentedField.svelte';
	import AppVersion from '$lib/components/AppVersion.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const { form, errors, message, submitting, enhance } = untrack(() => superForm(data.form));

	// Where to return the commander — the page they came from, or the hub as a safe fallback.
	const backHref = $derived(data.from ?? '/');

	const typeOptions = [
		{ value: 'bug', label: 'Bug', tone: 'attacker' as const },
		{ value: 'suggestion', label: 'Suggestion', tone: 'accent' as const }
	];

	const panel =
		"relative bg-panel border border-border px-[22px] pt-5 pb-[22px] before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-[linear-gradient(90deg,var(--color-accent),transparent_70%)] before:opacity-70 before:content-['']";
	const sec =
		"flex items-center gap-2.5 font-display font-semibold text-[10px] tracking-[0.14em] uppercase text-ink-dim mb-4 after:content-[''] after:flex-1 after:h-px after:bg-border";
	const label = 'font-display font-semibold text-[10px] tracking-[0.1em] uppercase text-ink-dim';
	const control =
		'w-full bg-void border border-border px-[11px] py-2.5 font-body text-[13px] text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-[120ms] focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent-mid),0_0_14px_var(--color-accent-soft)] aria-invalid:border-state-attacker-line aria-invalid:shadow-[0_0_0_1px_var(--color-state-attacker-line)]';
</script>

<div class="relative min-h-[100dvh] bg-void">
	<header
		class="relative z-10 flex items-center gap-4 border-b border-border bg-[linear-gradient(180deg,var(--color-panel)_0%,transparent_140%)] px-[22px] py-3.5 backdrop-blur-[6px] after:absolute
			after:-bottom-px after:left-0 after:h-px after:w-full after:bg-[linear-gradient(90deg,transparent,var(--color-border-lum)_30%,var(--color-border-lum)_70%,transparent)] after:opacity-60 after:content-[''] max-[680px]:px-4"
	>
		<a
			class="flex items-center gap-[13px] no-underline"
			href="/"
			aria-label="Back to your campaigns"
		>
			<BrandMark
				class="size-9 shrink-0 text-accent drop-shadow-[0_0_6px_var(--color-accent-glow)]"
			/>
			<span
				class="font-display text-[19px] font-bold tracking-[0.03em] text-ink max-[680px]:text-[17px]"
			>
				DOMINATUS
			</span>
		</a>

		<div class="flex-1"></div>

		<Button href={backHref} variant="ghost">‹ Back</Button>
	</header>

	<main class="mx-auto max-w-[720px] px-6 pt-9 pb-20 max-[680px]:px-4">
		<header class="mb-7">
			<p
				class="mb-2.5 font-display text-[10px] font-semibold tracking-[0.14em] text-accent uppercase"
			>
				// Feedback
			</p>
			<h1 class="font-display text-[30px] leading-none font-bold tracking-[0.01em] text-ink">
				Report an Issue
			</h1>
			<p class="mt-3 max-w-[64ch] font-body text-[13px] leading-[1.55] text-ink-dim">
				Found a fault or have a suggestion to sharpen the cogitator? Send it through — it reaches
				the maintainer with your address attached, so you'll get a reply.
			</p>
		</header>

		<form method="POST" use:enhance class="flex flex-col gap-[18px]">
			<section class={panel}>
				<h2 class={sec}>// Transmission</h2>

				<div class="flex flex-col gap-1.5">
					<span class={label}>› Kind</span>
					<SegmentedField
						options={typeOptions}
						bind:value={$form.type}
						ariaLabel="Report kind"
						class="max-w-[320px]"
					/>
				</div>

				<label class="mt-4 flex flex-col gap-1.5">
					<span class={label}>› Message</span>
					<textarea
						class="{control} resize-y leading-normal"
						name="message"
						rows="7"
						maxlength="4000"
						bind:value={$form.message}
						placeholder={$form.type === 'bug'
							? 'What went wrong? What did you expect to happen?'
							: 'What would make the cogitator better?'}
						aria-invalid={$errors.message ? 'true' : undefined}
					></textarea>
					{#if $errors.message}
						<span class="font-body text-[12px] text-state-attacker">{$errors.message}</span>
					{/if}
				</label>

				<div
					class="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3.5"
				>
					<p class="font-body text-[12px] text-ink-faint">
						Sent as <span class="text-ink-dim">{data.user.name || data.user.email}</span>
						({data.user.email}).
					</p>
					<AppVersion />
				</div>
			</section>

			<footer class="flex flex-wrap items-center justify-between gap-3.5 pt-1">
				<div class="min-h-[18px]">
					{#if $message}<span class="font-body text-[12px] text-accent" role="status"
							>{$message}</span
						>{/if}
				</div>
				<div class="flex gap-2.5">
					<Button variant="ghost" href={backHref}>Cancel</Button>
					<Button type="submit" variant="primary" disabled={$submitting}>
						{$submitting ? 'Transmitting…' : 'Send report'}
					</Button>
				</div>
			</footer>
		</form>
	</main>
</div>
