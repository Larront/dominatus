<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import DestructiveForm from '$lib/components/ui/DestructiveForm.svelte';
	import EffectRow from '$lib/components/admin/EffectRow.svelte';
	import WorldRow from '$lib/components/admin/WorldRow.svelte';
	import { SCORING_GROUPS } from '$lib/domain/scoring-profile';
	import { ARCHETYPES } from '$lib/domain/archetypes';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const base = $derived(`/campaigns/${page.params.slug}`);
	const archetypes = ARCHETYPES.map((a) => ({ value: a.render, label: a.tag }));

	// Transfer the arbiter role to another commander; the action redirects the demoted arbiter away.
	const commanders = $derived(data.members.filter((m) => m.role === 'commander'));
	const transferErrorMsg = $derived(
		(page.form as { transferError?: string } | null)?.transferError ?? null
	);
	let transferTo = $state('');
	let confirmingTransfer = $state(false);

	// Scoring profile edit (ADR 0004). Same flat-superform + direct-bind pattern as the founding
	// page's grid, so a zeroed category reads as "off" and saving re-scores the campaign on read.
	const {
		form: profile,
		message: profileMessage,
		submitting: profileSubmitting,
		enhance: profileEnhance
		// dataType:'json' posts the whole $profile store as structured data — the point inputs bind
		// to $profile[...] with no `name`, so without this only named fields post and every value
		// arrives 0. Mirrors the founding form's scoring grid.
	} = untrack(() =>
		superForm(data.profileForm, {
			id: 'profile',
			resetForm: false,
			dataType: 'json',
			scrollToError: 'smooth'
		})
	);

	// Join code — the credential commanders enter to enlist. Copyable, and regeneratable to revoke
	// one that's been shared too widely (the load re-reads the campaign, so the new code shows).
	let copied = $state(false);
	async function copyCode() {
		try {
			await navigator.clipboard.writeText(data.campaign.joinCode ?? '');
			copied = true;
			setTimeout(() => (copied = false), 1600);
		} catch {
			// Clipboard blocked (insecure context / permissions) — the code stays visible to type.
		}
	}

	// Campaign-details edit (Superforms). `id: 'details'` scopes it so the plain delete-report
	// action's response never feeds back into this form's state.
	const {
		form: details,
		errors: detailsErrors,
		message: detailsMessage,
		submitting: detailsSubmitting,
		enhance: detailsEnhance
	} = untrack(() =>
		superForm(data.detailsForm, { id: 'details', resetForm: false, scrollToError: 'smooth' })
	);

	// Add-effect (single form). The per-row edit/delete forms live in EffectRow; worlds in WorldRow.
	const {
		form: newEffect,
		errors: newEffectErrors,
		message: newEffectMessage,
		submitting: newEffectSubmitting,
		enhance: newEffectEnhance
	} = untrack(() => superForm(data.createForm, { id: 'effect-create', resetForm: true }));

	const outcomeMeta = {
		attacker: {
			label: 'Attacker won',
			cls: 'text-state-attacker bg-state-attacker-soft border-state-attacker-line'
		},
		defender: {
			label: 'Defender held',
			cls: 'text-state-defender bg-state-defender-soft border-state-defender-line'
		},
		stalemate: {
			label: 'Stalemate',
			cls: 'text-state-contested bg-state-contested-soft border-state-contested-line'
		}
	} as const;

	const panel =
		"relative bg-panel border border-border px-[22px] pt-5 pb-[22px] before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-[linear-gradient(90deg,var(--color-accent),transparent_70%)] before:opacity-70 before:content-['']";
	const sec =
		"flex items-center gap-2.5 font-display font-semibold text-[10px] tracking-[0.14em] uppercase text-ink-dim mb-4 after:content-[''] after:flex-1 after:h-px after:bg-border";
	const label = 'font-display font-semibold text-[10px] tracking-[0.1em] uppercase text-ink-dim';
	const control =
		'w-full bg-void border border-border px-[11px] py-2.5 font-body text-[13px] text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-[120ms] focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent-mid),0_0_14px_var(--color-accent-soft)] aria-invalid:border-state-attacker-line aria-invalid:shadow-[0_0_0_1px_var(--color-state-attacker-line)]';
	const num =
		'w-[58px] bg-void border border-border px-2 py-2 font-body text-[14px] text-center tabular-nums text-ink transition-[border-color,box-shadow] duration-[120ms] focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent-mid)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none';
</script>

<main class="mx-auto max-w-[880px] px-6 pt-[30px] pb-20 max-[680px]:px-4">
	<header class="mb-7">
		<p
			class="mb-2.5 font-display text-[10px] font-semibold tracking-[0.14em] text-accent uppercase"
		>
			// Arbiter Console
		</p>
		<h1 class="font-display text-[30px] leading-none font-bold tracking-[0.01em] text-ink">
			Manage Campaign
		</h1>
		<p class="mt-3 max-w-[64ch] text-[13px] leading-[1.55] text-ink-dim">
			Edit campaign details and correct the battle-report log. Deleting or amending a report
			re-folds control and standings from the full log — the record stays honest.
		</p>
	</header>

	<div class="flex flex-col gap-[18px]">
		<!-- ── Campaign details ──────────────────────────────────── -->
		<section class={panel}>
			<h2 class={sec}>// Campaign Details</h2>
			<form method="POST" action="?/saveDetails" class="flex flex-col gap-3.5" use:detailsEnhance>
				<label class="flex flex-col gap-1.5">
					<span class={label}>› Name</span>
					<input
						class={control}
						name="name"
						bind:value={$details.name}
						maxlength="80"
						aria-invalid={$detailsErrors.name ? 'true' : undefined}
					/>
					{#if $detailsErrors.name}<span class="font-body text-[12px] text-state-attacker"
							>{$detailsErrors.name}</span
						>{/if}
				</label>
				<label class="flex flex-col gap-1.5">
					<span class={label}>› Subtitle <span class="text-ink-faint">optional</span></span>
					<input
						class={control}
						name="subtitle"
						bind:value={$details.subtitle}
						maxlength="120"
						placeholder="e.g. Malvernis Sector · 10th Edition"
					/>
				</label>
				<div class="flex flex-wrap items-end justify-between gap-3.5">
					<label class="flex w-[140px] flex-col gap-1.5">
						<span class={label}>› Current cycle</span>
						<input
							class={control}
							name="currentCycle"
							type="number"
							min="1"
							step="1"
							inputmode="numeric"
							bind:value={$details.currentCycle}
							aria-invalid={$detailsErrors.currentCycle ? 'true' : undefined}
						/>
						{#if $detailsErrors.currentCycle}<span class="font-body text-[12px] text-state-attacker"
								>{$detailsErrors.currentCycle}</span
							>{/if}
					</label>
					<div class="flex items-center gap-3">
						{#if $detailsMessage}<span class="font-body text-[12px] text-accent"
								>{$detailsMessage}</span
							>{/if}
						<Button type="submit" variant="primary" disabled={$detailsSubmitting}>
							{$detailsSubmitting ? 'Saving…' : 'Save details'}
						</Button>
					</div>
				</div>
			</form>

			<!-- Join code: the credential commanders enter to enlist. -->
			<div class="mt-5 border-t border-border pt-4">
				<span class={label}>› Join code</span>
				<p class="mt-1 mb-2.5 max-w-[60ch] font-body text-[12px] leading-[1.5] text-ink-faint">
					Share this with your commanders so they can enlist. Regenerate it to revoke a code that's
					spread too far — the old one stops working at once.
				</p>
				<div class="flex flex-wrap items-center gap-2.5">
					<span
						class="border border-border-lum/40 bg-void px-3.5 py-2 font-display text-[22px] font-bold tracking-[0.32em] text-accent tabular-nums select-all"
					>
						{data.campaign.joinCode ?? '—'}
					</span>
					<Button type="button" onclick={copyCode}>{copied ? '✓ Copied' : 'Copy'}</Button>
					<form method="POST" action="?/regenerateCode" use:enhance>
						<Button type="submit">↻ Regenerate</Button>
					</form>
				</div>
			</div>
		</section>

		<!-- ── Transfer arbiter role ─────────────────────────────── -->
		<section class={panel}>
			<h2 class={sec}>// Transfer Arbiter Role</h2>
			{#if commanders.length === 0}
				<p class="font-body text-[13px] leading-[1.55] text-ink-dim">
					No other commanders have enlisted yet. Once one joins, you can hand off the arbiter role.
				</p>
			{:else}
				<p class="mb-4 max-w-[64ch] font-body text-[13px] leading-[1.55] text-ink-dim">
					Hand the arbiter's authority to another commander. You'll be demoted to commander and lose
					access to this console — only the new arbiter can hand it back.
				</p>
				<form
					method="POST"
					action="?/transferArbiter"
					class="flex flex-wrap items-end gap-3.5"
					use:enhance
				>
					<label class="flex min-w-[220px] flex-1 flex-col gap-1.5">
						<span class={label}>› New arbiter</span>
						<select name="toUserId" bind:value={transferTo} class={control}>
							<option value="" disabled>Select a commander…</option>
							{#each commanders as m (m.userId)}
								<option value={m.userId}>{m.name}</option>
							{/each}
						</select>
					</label>
					{#if confirmingTransfer}
						<div class="flex items-center gap-3">
							<Button type="submit" variant="primary" disabled={!transferTo}>Confirm transfer</Button>
							<Button type="button" onclick={() => (confirmingTransfer = false)}>Cancel</Button>
						</div>
					{:else}
						<Button
							type="button"
							onclick={() => (confirmingTransfer = true)}
							disabled={!transferTo}
						>
							Transfer role
						</Button>
					{/if}
				</form>
				{#if transferErrorMsg}
					<p class="mt-3 font-body text-[12px] text-state-attacker">{transferErrorMsg}</p>
				{/if}
			{/if}
		</section>

		<!-- ── Scoring profile ───────────────────────────────────── -->
		<section class={panel}>
			<h2 class={sec}>// Scoring</h2>
			<p class="mb-4 font-body text-[12.5px] leading-[1.5] text-ink-dim">
				Tune what each deed is worth. A category at <b class="text-ink">0</b> is switched off — commanders
				won't see it. Saving re-scores the standings, since points are folded from the log on read.
			</p>
			<form method="POST" action="?/saveProfile" class="flex flex-col gap-5" use:profileEnhance>
				{#each SCORING_GROUPS as group (group.title)}
					<div>
						<p
							class="mb-2 font-display text-[10px] font-semibold tracking-[0.12em] text-accent uppercase"
						>
							{group.title}
							<span class="ml-1 font-body text-[10.5px] tracking-normal text-ink-faint normal-case"
								>— {group.blurb}</span
							>
						</p>
						<div class="flex flex-col">
							{#each group.categories as cat (cat.key)}
								{@const off = $profile[cat.key] === 0}
								<div
									class="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0 {off
										? 'opacity-45'
										: ''}"
								>
									<span class="flex min-w-0 flex-1 flex-col">
										<span class="flex items-center gap-2 font-body text-[13px] text-ink">
											{cat.label}
											{#if off}<span
													class="border border-border px-1 py-px font-display text-[8px] font-semibold tracking-[0.1em] text-ink-faint uppercase"
													>Off</span
												>{/if}
										</span>
										<span class="font-body text-[11px] leading-[1.4] text-ink-faint"
											>{cat.hint}</span
										>
									</span>
									{#if cat.threshold}
										<span class="flex items-center gap-1.5 font-body text-[11px] text-ink-dim">
											{cat.threshold.prefix}
											<input
												type="number"
												min="0"
												step="1"
												inputmode="numeric"
												aria-label="{cat.label} threshold"
												bind:value={$profile[cat.threshold.key]}
												class="{num} w-[52px]"
											/>
											{cat.threshold.suffix}
										</span>
									{/if}
									<label class="flex items-center gap-1.5">
										<span class="font-display text-[9px] tracking-[0.1em] text-ink-faint uppercase"
											>pts</span
										>
										<input
											type="number"
											min="0"
											step="1"
											inputmode="numeric"
											aria-label="{cat.label} points"
											bind:value={$profile[cat.key]}
											class={num}
										/>
									</label>
								</div>
							{/each}
						</div>
					</div>
				{/each}
				<div class="flex items-center justify-end gap-3">
					{#if $profileMessage}<span class="font-body text-[12px] text-accent"
							>{$profileMessage}</span
						>{/if}
					<Button type="submit" variant="primary" disabled={$profileSubmitting}>
						{$profileSubmitting ? 'Saving…' : 'Save scoring'}
					</Button>
				</div>
			</form>
		</section>

		<!-- ── Planetary-effect pool ─────────────────────────────── -->
		<section class={panel}>
			<h2 class={sec}>// Planetary Effects</h2>
			<p class="mb-4 font-body text-[12.5px] leading-[1.5] text-ink-dim">
				The pool of effects that can be in play. Descriptive only — attach them to worlds in the
				Worlds section below. Edit a title or wording any time.
			</p>

			{#if data.effects.length}
				<ul class="mb-4 flex flex-col gap-2.5">
					{#each data.effects as e (e.id)}
						<EffectRow editForm={data.effectForms[e.id]} deleteForm={data.deleteForm} {control} />
					{/each}
				</ul>
			{/if}

			<form
				method="POST"
				action="?/createEffect"
				class="flex items-start gap-2.5 border-t border-border pt-4"
				use:newEffectEnhance
			>
				<div class="flex min-w-0 flex-1 flex-col gap-2">
					<input
						name="title"
						bind:value={$newEffect.title}
						placeholder="New effect — e.g. Warp Storm"
						maxlength="60"
						class="{control} py-2"
						aria-invalid={$newEffectErrors.title ? 'true' : undefined}
					/>
					{#if $newEffectErrors.title}<span class="font-body text-[12px] text-state-attacker"
							>{$newEffectErrors.title}</span
						>{/if}
					<textarea
						name="description"
						bind:value={$newEffect.description}
						rows="2"
						maxlength="400"
						placeholder="What it does, in your words. The app shows it; it never enforces it."
						class="{control} resize-none py-2 leading-[1.45]"
					></textarea>
				</div>
				<div class="flex flex-col items-end gap-1.5">
					<Button type="submit" variant="primary" class="px-3 py-2" disabled={$newEffectSubmitting}
						>+ Add</Button
					>
					{#if $newEffectMessage}<span class="font-body text-[11px] text-accent"
							>{$newEffectMessage}</span
						>{/if}
				</div>
			</form>
		</section>

		<!-- ── Worlds ────────────────────────────────────────────── -->
		<section class={panel}>
			<h2 class={sec}>// Worlds</h2>
			<p class="mb-4 font-body text-[12.5px] leading-[1.5] text-ink-dim">
				Edit a world's details, and toggle which planetary effects are currently in play on it.
			</p>

			<div class="flex flex-col gap-4">
				{#each data.worlds as w (w.id)}
					<WorldRow
						world={w}
						editForm={data.worldForms[w.id]}
						effects={data.effects}
						{archetypes}
						{control}
						{label}
					/>
				{/each}
			</div>
		</section>

		<!-- ── Report management ─────────────────────────────────── -->
		<section class={panel}>
			<h2 class={sec}>// Battle Reports</h2>

			{#if data.reports.length === 0}
				<p class="font-body text-[13px] leading-[1.55] text-ink-dim">
					No reports logged yet. Filed reports will appear here for amendment or reversal.
				</p>
			{:else}
				<ul class="flex flex-col">
					{#each data.reports as r (r.id)}
						{@const meta = outcomeMeta[r.outcome]}
						<li
							class="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border py-3 first:border-t-0"
						>
							<span class="flex w-9 shrink-0 flex-col items-center" title="Cycle {r.cycle}">
								<span class="font-body text-[16px] leading-none font-semibold text-accent"
									>{r.cycle}</span
								>
								<span class="font-display text-[8px] tracking-[0.1em] text-ink-faint uppercase"
									>Cyc</span
								>
							</span>

							<span class="min-w-[110px] font-display text-[12px] font-semibold text-ink">
								{r.worldName}
							</span>

							<span
								class="flex items-center gap-1.5 font-display text-[11px] font-semibold text-ink-dim"
							>
								{#each r.attackers as c, i (i)}
									<span class="size-2 shrink-0" style="background: {c.color}"></span>{c.short}
								{/each}
								<span class="font-display text-[9px] tracking-[0.1em] text-ink-faint uppercase"
									>vs</span
								>
								{#each r.defenders as c, i (i)}
									<span class="size-2 shrink-0" style="background: {c.color}"></span>{c.short}
								{/each}
							</span>

							<span
								class="border px-[7px] py-[3px] font-display text-[9px] font-semibold tracking-[0.05em] uppercase {meta.cls}"
							>
								{meta.label}
							</span>

							<span class="ml-auto flex shrink-0 items-center gap-2">
								<Button href="{base}/report?edit={r.id}">Edit</Button>
								<DestructiveForm
									form={data.deleteForm}
									formId="delete-{r.id}"
									action="?/deleteReport"
									recordId={r.id}
									confirm="Delete the report over {r.worldName}? Standings and control will be recalculated as if it had never been submitted — this can't be undone."
									class="inline-flex cursor-pointer items-center justify-center border border-border bg-panel-2 px-3.5 py-2.5 font-display text-[11px] font-semibold tracking-[0.09em] text-ink-dim uppercase transition-[color,border-color,background-color] duration-[120ms] hover:border-state-attacker-line hover:bg-state-attacker-soft hover:text-state-attacker focus-visible:border-state-attacker-line focus-visible:outline-none"
								>
									Delete Report
								</DestructiveForm>
							</span>
						</li>
					{/each}
				</ul>
				<p
					class="mt-4 border-t border-border pt-3 font-body text-[11.5px] leading-[1.45] text-ink-faint"
				>
					Reports are listed in fold order (oldest first) — the order control replays.
				</p>
			{/if}
		</section>
	</div>
</main>
