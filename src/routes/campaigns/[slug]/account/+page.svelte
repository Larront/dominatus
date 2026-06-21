<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import { goto } from '$app/navigation';
	import { signOut } from '$lib/auth-client';
	import Button from '$lib/components/ui/Button.svelte';
	import DeleteAccountSection from '$lib/components/DeleteAccountSection.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const { form, errors, message, submitting, enhance } = untrack(() => superForm(data.form));

	// The colour swatches mirror the seed palette so a fresh campaign reads as deliberate
	// rather than browser-default.
	const palette = ['#5f93c4', '#cf4b34', '#46ad72', '#d6a23c', '#9778cf', '#3fa3a3'];

	async function logout() {
		await signOut();
		await goto('/', { invalidateAll: true });
	}

	const panel =
		"relative bg-panel border border-border px-[22px] pt-5 pb-[22px] before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-[linear-gradient(90deg,var(--color-accent),transparent_70%)] before:opacity-70 before:content-['']";
	const sec =
		"flex items-center gap-2.5 font-display font-semibold text-[10px] tracking-[0.14em] uppercase text-ink-dim mb-4 after:content-[''] after:flex-1 after:h-px after:bg-border";
	const label = 'font-display font-semibold text-[10px] tracking-[0.1em] uppercase text-ink-dim';
	const control =
		'w-full bg-void border border-border px-[11px] py-2.5 font-body text-[13px] text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-[120ms] focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent-mid),0_0_14px_var(--color-accent-soft)]';
	const fieldError = 'font-body text-[12px] text-state-attacker';
</script>

<main class="mx-auto max-w-[880px] px-6 pt-[30px] pb-20 max-[680px]:px-4">
	<header class="mb-7">
		<p
			class="mb-2.5 font-display text-[10px] font-semibold tracking-[0.14em] text-accent uppercase"
		>
			// Commander Dossier
		</p>
		<h1 class="font-display text-[30px] leading-none font-bold tracking-[0.01em] text-ink">
			Your Warbands
		</h1>
		<p class="mt-3 max-w-[64ch] text-[13px] leading-[1.55] text-ink-dim">
			Your role in <strong class="text-ink">{data.campaign.name}</strong> is
			<strong class="text-ink">{data.role}</strong>. Muster the warbands you command here — each one
			contends for control of worlds and appears in the standings.
		</p>
	</header>

	<div class="flex flex-col gap-[18px]">
		<!-- ── Identity ──────────────────────────────────────────── -->
		<section class={panel}>
			<h2 class={sec}>// Identity</h2>
			<dl class="flex flex-col">
				<div class="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0">
					<dt
						class="w-[120px] font-display text-[10px] font-semibold tracking-[0.1em] text-ink-faint uppercase"
					>
						Commander
					</dt>
					<dd class="font-body text-[13px] text-ink">{data.user.name || '—'}</dd>
				</div>
				<div class="flex items-center gap-3 border-t border-border py-2.5">
					<dt
						class="w-[120px] font-display text-[10px] font-semibold tracking-[0.1em] text-ink-faint uppercase"
					>
						Email
					</dt>
					<dd class="font-body text-[13px] break-all text-ink">{data.user.email}</dd>
				</div>
			</dl>
			<p class="mt-3.5 border-t border-border pt-3.5 font-body text-[12.5px] text-ink-dim">
				Manage your account across all campaigns on the
				<a href="/account" class="text-accent transition-colors duration-150 hover:underline"
					>full account screen</a
				>.
			</p>
		</section>

		<!-- ── Roster ────────────────────────────────────────────── -->
		<section class={panel}>
			<h2 class={sec}>// Roster</h2>

			{#if data.warbands.length === 0}
				<p class="font-body text-[13px] leading-[1.55] text-ink-dim">
					You command no warbands yet. Muster one below to take the field.
				</p>
			{:else}
				<ul class="flex flex-col">
					{#each data.warbands as wb (wb.id)}
						<li class="flex items-center gap-3.5 border-t border-border py-3 first:border-t-0">
							<span
								class="size-[26px] shrink-0 border border-border-lum shadow-[0_0_8px_currentColor]"
								style="color: {wb.color}; background: {wb.color}"
								aria-hidden="true"
							></span>
							<span class="min-w-0 flex-1 truncate font-display text-[14px] font-semibold text-ink">
								{wb.name}
							</span>
							<span
								class="shrink-0 border border-border px-2 py-0.5 font-display text-[10px] font-semibold tracking-[0.1em] text-ink-dim uppercase tabular-nums"
							>
								{wb.short}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- ── Muster a warband ──────────────────────────────────── -->
		<section class={panel}>
			<h2 class={sec}>// Muster a Warband</h2>

			<form method="POST" action="?/createWarband" class="flex flex-col gap-3.5" use:enhance>
				<label class="flex flex-col gap-1.5">
					<span class={label}>› Name</span>
					<input
						class={control}
						name="name"
						bind:value={$form.name}
						maxlength="60"
						placeholder="e.g. Iron Wardens"
						aria-invalid={$errors.name ? 'true' : undefined}
					/>
					{#if $errors.name}<span class={fieldError}>{$errors.name}</span>{/if}
				</label>

				<div class="flex flex-wrap items-start gap-3.5">
					<label class="flex w-[120px] flex-col gap-1.5">
						<span class={label}>› Tag</span>
						<!-- Stored uppercase (schema transform); shown uppercase so display matches storage. -->
						<input
							class="{control} uppercase tabular-nums"
							name="short"
							bind:value={$form.short}
							maxlength="4"
							placeholder="IW"
							aria-invalid={$errors.short ? 'true' : undefined}
						/>
					</label>

					<div class="flex flex-1 flex-col gap-1.5">
						<span class={label}>› Colour</span>
						<div class="flex items-center gap-2.5">
							<!-- Native picker for any hue; the presets are quick, on-palette choices. -->
							<input
								type="color"
								name="color"
								bind:value={$form.color}
								aria-label="Warband colour"
								class="size-[38px] shrink-0 cursor-pointer border border-border bg-void p-1"
							/>
							<div class="flex flex-wrap gap-1.5">
								{#each palette as swatch (swatch)}
									<button
										type="button"
										aria-label="Use colour {swatch}"
										aria-pressed={$form.color === swatch}
										onclick={() => ($form.color = swatch)}
										class="size-[26px] cursor-pointer border transition-[border-color,box-shadow] duration-[120ms] {$form.color ===
										swatch
											? 'border-accent shadow-[0_0_0_1px_var(--color-accent-mid)]'
											: 'border-border hover:border-border-lum'}"
										style="background: {swatch}"
									></button>
								{/each}
							</div>
						</div>
					</div>
				</div>

				{#if $errors.short}<span class={fieldError}>{$errors.short}</span>{/if}
				{#if $errors.color}<span class={fieldError}>{$errors.color}</span>{/if}

				<div class="flex flex-wrap items-center justify-between gap-3.5 pt-1">
					<div class="min-h-[18px]">
						{#if $message}<span class="font-body text-[12px] text-accent">{$message}</span>{/if}
					</div>
					<Button type="submit" variant="primary" disabled={$submitting}>
						{$submitting ? 'Mustering…' : 'Muster warband'}
					</Button>
				</div>
			</form>
		</section>

		<!-- ── Session ───────────────────────────────────────────── -->
		<section class={panel}>
			<h2 class={sec}>// Session</h2>
			<div class="flex items-center justify-between gap-3.5">
				<p class="font-body text-[13px] text-ink-dim">Sign out of the campaign cogitator.</p>
				<Button type="button" onclick={logout}>Sign out</Button>
			</div>
		</section>

		<!-- ── Danger zone ───────────────────────────────────────── -->
		<DeleteAccountSection arbiterCampaigns={data.arbiterCampaigns} />
	</div>
</main>
