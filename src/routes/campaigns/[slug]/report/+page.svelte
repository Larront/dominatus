<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import { page } from '$app/state';
	import { applyReport } from '$lib/domain/control-fold';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import SegmentedField from '$lib/components/ui/SegmentedField.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const { form, errors, enhance, message, submitting } = untrack(() =>
		superForm(data.form, { dataType: 'json' })
	);

	const base = $derived(`/campaigns/${page.params.slug}`);
	// Arbiter amend mode (?edit=<id>): the form is prefilled and posts back to the same URL, which
	// the action reads to update + re-fold instead of inserting. Cancel returns to the admin panel.
	const editing = $derived(data.editing);
	const exitHref = $derived(editing ? `${base}/admin` : base);

	const wbMap = $derived(new Map(data.warbands.map((w) => [w.id, w])));
	const wbName = (id: string) => wbMap.get(id)?.name ?? '';
	const wbColor = (id: string) => wbMap.get(id)?.color ?? 'var(--color-ink-dim)';

	const worldItems = $derived(data.worlds.map((w) => ({ value: w.id, label: w.name })));
	const warbandItems = $derived(
		data.warbands.map((w) => ({
			value: w.id,
			label: w.name + (w.commanderUserId === data.userId ? ' · You' : '')
		}))
	);

	const canReport = $derived(data.worlds.length > 0 && data.warbands.length >= 2);

	const format = $derived(
		$form.combatants.filter((c) => c.side === 'attacker').length === 2 ? '2v2' : '1v1'
	);
	const attackerIdx = $derived(
		$form.combatants.flatMap((c, i) => (c.side === 'attacker' ? [i] : []))
	);
	const defenderIdx = $derived(
		$form.combatants.flatMap((c, i) => (c.side === 'defender' ? [i] : []))
	);

	const formatOptions = [
		{ value: '1v1', label: '1 v 1' },
		{ value: '2v2', label: '2 v 2' }
	];
	const outcomeOptions = [
		{ value: 'attacker', label: '◂ Attacker won', tone: 'attacker' as const },
		{ value: 'stalemate', label: 'Stalemate', tone: 'contested' as const },
		{ value: 'defender', label: 'Defender held ▸', tone: 'defender' as const }
	];

	function setFormat(next: string) {
		const n = next === '2v2' ? 2 : 1;
		const blank = (side: 'attacker' | 'defender') => ({ side, warbandId: '', secondaries: [] });
		const att = $form.combatants.filter((c) => c.side === 'attacker');
		const def = $form.combatants.filter((c) => c.side === 'defender');
		while (att.length < n) att.push(blank('attacker'));
		while (def.length < n) def.push(blank('defender'));
		$form.combatants = [...att.slice(0, n), ...def.slice(0, n)];
	}

	function patchCombatant(i: number, patch: Record<string, unknown>) {
		$form.combatants = $form.combatants.map((c, k) => (k === i ? { ...c, ...patch } : c));
	}
	function addSecondary(i: number) {
		const secs = $form.combatants[i].secondaries ?? [];
		if (secs.length >= 6) return;
		patchCombatant(i, { secondaries: [...secs, { name: '', victoryPoints: 0 }] });
	}
	function removeSecondary(i: number, j: number) {
		const secs = $form.combatants[i].secondaries ?? [];
		patchCombatant(i, { secondaries: secs.filter((_, k) => k !== j) });
	}
	function patchSecondary(i: number, j: number, patch: Record<string, unknown>) {
		const secs = ($form.combatants[i].secondaries ?? []).map((s, k) =>
			k === j ? { ...s, ...patch } : s
		);
		patchCombatant(i, { secondaries: secs });
	}

	function vpTotal(c: (typeof $form.combatants)[number]): number | null {
		const parts = [
			c.primaryVp,
			c.battleReadyVp,
			...(c.secondaries ?? []).map((s) => s.victoryPoints)
		].filter((n): n is number => typeof n === 'number');
		return parts.length ? parts.reduce((a, b) => a + b, 0) : null;
	}

	const attackerVictor = $derived($form.outcome === 'attacker');
	const defenderVictor = $derived($form.outcome === 'defender');

	const sideTotal = (idx: number[]) => {
		const totals = idx.map((i) => vpTotal($form.combatants[i]));
		return totals.every((t) => t === null) ? null : totals.reduce((a, b) => (a ?? 0) + (b ?? 0), 0);
	};
	const vpHint = $derived.by(() => {
		if ($form.outcome !== 'attacker' && $form.outcome !== 'defender') return null;
		const a = sideTotal(attackerIdx);
		const d = sideTotal(defenderIdx);
		if (a === null || d === null || a === d) return null;
		const favours = a > d ? 'attacker' : 'defender';
		return favours === $form.outcome ? null : `Recorded scores favour the ${favours}.`;
	});

	const selectedWorld = $derived(data.worlds.find((w) => w.id === $form.worldId) ?? null);

	const currentControl = $derived.by(() => {
		if (!selectedWorld) return null;
		const held = [...selectedWorld.shares]
			.filter((s) => s.share > 0)
			.sort((a, b) => b.share - a.share);
		const uncontested = Math.max(0, 100 - held.reduce((sum, s) => sum + s.share, 0));
		return { held, uncontested };
	});

	const preview = $derived.by(() => {
		if (!selectedWorld) return null;
		const o = $form.outcome;
		if (o !== 'attacker' && o !== 'defender' && o !== 'stalemate') return null;
		const combatants = $form.combatants
			.filter((c) => c.warbandId)
			.map((c) => ({ warbandId: c.warbandId, side: c.side }));
		if (combatants.length < 2) return null;
		const current = new Map(selectedWorld.shares.map((s) => [s.warbandId, s.share]));
		const next = applyReport(current, { outcome: o, combatants });
		const ids = new Set([...combatants.map((c) => c.warbandId), ...current.keys(), ...next.keys()]);
		const rows = [...ids]
			.map((id) => ({
				id,
				before: current.get(id) ?? 0,
				after: next.get(id) ?? 0,
				involved: combatants.some((c) => c.warbandId === id)
			}))
			.filter((r) => r.involved || r.before !== r.after)
			.sort((a, b) => b.after - a.after);
		return { rows, stalemate: o === 'stalemate' };
	});

	// Optional image → CV draft seam (ADR 0001): present but inert until the CV stack lands.
	let imageFile = $state<File | null>(null);
	function onImagePick(event: Event) {
		imageFile = (event.currentTarget as HTMLInputElement).files?.[0] ?? null;
	}

	// Shared utility recipes (composition in JS, not CSS).
	const panel =
		"relative bg-panel border border-border px-[22px] pt-5 pb-[22px] before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-[linear-gradient(90deg,var(--color-accent),transparent_70%)] before:opacity-70 before:content-['']";
	const sec =
		"flex items-center gap-2.5 font-display font-semibold text-[10px] tracking-[0.14em] uppercase text-ink-dim mb-4 after:content-[''] after:flex-1 after:h-px after:bg-border";
	const label = 'font-display font-semibold text-[10px] tracking-[0.1em] uppercase text-ink-dim';
	const control =
		'w-full bg-void border border-border px-[11px] py-2.5 font-body text-[13px] text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-[120ms] focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent-mid),0_0_14px_var(--color-accent-soft)]';

	function sideClass(kind: 'attacker' | 'defender', victor: boolean) {
		const top =
			kind === 'attacker'
				? 'before:bg-[linear-gradient(90deg,var(--color-state-attacker),transparent_75%)]'
				: 'before:bg-[linear-gradient(270deg,var(--color-state-defender),transparent_75%)]';
		const vic = !victor
			? 'border-border'
			: kind === 'attacker'
				? 'border-state-attacker-line shadow-[inset_0_2px_22px_var(--color-state-attacker-soft)]'
				: 'border-state-defender-line shadow-[inset_0_2px_22px_var(--color-state-defender-soft)]';
		return `relative m-0 min-w-0 bg-panel border ${vic} px-[18px] pt-4 pb-[18px] transition-[border-color,box-shadow] duration-[180ms] before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:opacity-[0.85] before:content-[''] ${top}`;
	}
</script>

<main class="mx-auto max-w-[880px] px-6 pt-[30px] pb-20 max-[680px]:px-4 max-[680px]:pt-[22px]">
	<header>
		<p
			class="mb-2.5 font-display text-[10px] font-semibold tracking-[0.14em] text-accent uppercase"
		>
			// {editing ? 'Amend Battle Report' : 'File Battle Report'}
		</p>
		<h1
			class="font-display text-[30px] leading-none font-bold tracking-[0.01em] text-balance text-ink"
		>
			{editing ? 'Amend Report' : 'Battle Report'}
		</h1>
		<p class="mt-3 max-w-[64ch] text-[13px] leading-[1.55] text-ink-dim">
			{#if editing}
				Correct this report's details. Saving re-applies the result and re-folds control of the
				affected world(s) from the full log.
			{:else}
				Log a game fought over a world. Submitting applies the result at once: control of the world
				shifts the moment you confirm.
			{/if}
		</p>
	</header>

	{#if !canReport}
		<section
			class="mt-[30px] border border-border bg-panel px-[30px] py-[34px] text-center"
			aria-live="polite"
		>
			<h2 class="mb-2.5 font-display text-[18px] font-bold text-ink">Nothing to fight over yet</h2>
			<p class="mx-auto mb-[18px] max-w-[52ch] text-[13px] leading-[1.55] text-ink-dim">
				{#if data.worlds.length === 0}
					This campaign has no worlds defined. The arbiter sets up the planetary system before
					battles can be logged.
				{:else}
					A report needs at least two warbands. Muster the forces in this campaign, then come back
					to file the result.
				{/if}
			</p>
			<Button href={base}>Return to map</Button>
		</section>
	{:else}
		{#if $message}
			<div
				class="mt-[22px] flex items-center gap-3 border border-border-lum bg-accent-soft px-4 py-3"
				role="status"
			>
				<span
					class="size-2 shrink-0 bg-accent shadow-[0_0_8px_var(--color-accent)]"
					aria-hidden="true"
				></span>
				<p class="flex-1 text-[13px] text-accent-ink">{$message}</p>
				<Button variant="ghost" href={base} class="shrink-0">View map</Button>
			</div>
		{/if}

		<form
			method="POST"
			action={editing ? `?edit=${editing}` : undefined}
			use:enhance
			class="mt-[26px] flex flex-col gap-[18px]"
		>
			<!-- ── Theatre ───────────────────────────────────────────── -->
			<section class={panel}>
				<h2 class={sec}>// Theatre</h2>
				<div class="flex flex-wrap items-stretch gap-3.5">
					<div class="flex min-w-0 flex-1 basis-[240px] flex-col gap-1.5">
						<span class={label}>› World</span>
						<Select
							items={worldItems}
							bind:value={$form.worldId}
							ariaLabel="World"
							placeholder="Select a world"
						/>
						{#if $errors.worldId}<span class="font-body text-[11.5px] text-state-attacker"
								>{$errors.worldId}</span
							>{/if}
					</div>

					<div class="flex flex-col gap-1.5">
						<span class={label}>› Format</span>
						<SegmentedField
							options={formatOptions}
							value={format}
							onValueChange={setFormat}
							ariaLabel="Battle format"
							class="flex-1"
						/>
					</div>

					<label class="flex shrink-0 grow-0 basis-[120px] flex-col gap-1.5">
						<span class={label}>› Points</span>
						<input
							class={control}
							type="number"
							min="0"
							step="50"
							inputmode="numeric"
							placeholder="2000"
							bind:value={$form.pointsSize}
						/>
					</label>
				</div>

				{#if selectedWorld && currentControl}
					<div class="mt-[18px] border-t border-border pt-4">
						<span class="font-body text-[12.5px] text-ink-dim">
							{#if selectedWorld.derived.unclaimed}
								<b
									class="font-display text-[11px] font-semibold tracking-[0.04em] text-ink-faint uppercase"
									>Uncontested</b
								>
								· no warband holds {selectedWorld.name} yet
							{:else if selectedWorld.derived.contested}
								<b
									class="font-display text-[11px] font-semibold tracking-[0.04em] text-state-contested uppercase"
									>Contested</b
								>
								· no majority on {selectedWorld.name}
							{:else}
								<b
									class="font-display text-[11px] font-semibold tracking-[0.04em] text-accent uppercase"
									>Held</b
								>
								· {wbName(selectedWorld.derived.owner ?? '')} controls {selectedWorld.name}
							{/if}
						</span>
						<div
							class="mt-2.5 flex h-3.5 gap-px overflow-hidden border border-border bg-void"
							role="img"
							aria-label={currentControl.held
								.map((s) => `${wbName(s.warbandId)} ${s.share}%`)
								.join(', ') || 'Uncontested'}
						>
							{#each currentControl.held as s (s.warbandId)}
								<span
									class="h-full min-w-0.5"
									style="flex: {s.share}; background: {wbColor(s.warbandId)}"
								></span>
							{/each}
							{#if currentControl.uncontested > 0}
								<span
									class="h-full min-w-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_4px,var(--color-border)_4px,var(--color-border)_5px)]"
									style="flex: {currentControl.uncontested}"
								></span>
							{/if}
						</div>
					</div>
				{/if}
			</section>

			<!-- ── Confrontation ─────────────────────────────────────── -->
			{#snippet sidePanel(idxList: number[], kind: 'attacker' | 'defender', victor: boolean)}
				{@const lead = idxList[0]}
				{@const c = $form.combatants[lead]}
				{@const total = vpTotal(c)}
				<fieldset class={sideClass(kind, victor)}>
					<legend
						class="mb-3.5 flex items-center gap-2.5 p-0 {kind === 'defender'
							? 'flex-row-reverse max-[680px]:flex-row'
							: ''}"
					>
						<span
							class="font-display text-[13px] font-bold tracking-[0.1em] uppercase {kind ===
							'attacker'
								? 'text-state-attacker'
								: 'text-state-defender'}"
						>
							{kind === 'attacker' ? 'Attacker' : 'Defender'}
						</span>
						{#if victor}
							<span
								class="px-[7px] py-[3px] font-display text-[8.5px] font-bold tracking-[0.14em] text-void uppercase {kind ===
								'attacker'
									? 'bg-state-attacker'
									: 'bg-state-defender'}"
							>
								Victor
							</span>
						{/if}
					</legend>

					<!-- warband select(s): 1 in 1v1, 2 sharing a team score in 2v2 -->
					{#each idxList as i, pos (i)}
						<div class="mb-3 flex flex-col gap-1.5">
							<span class={label}>› Warband{idxList.length > 1 ? ` ${pos + 1}` : ''}</span>
							<Select
								items={warbandItems}
								value={$form.combatants[i].warbandId}
								onValueChange={(v) => patchCombatant(i, { warbandId: v })}
								leadColor={$form.combatants[i].warbandId ? wbColor($form.combatants[i].warbandId) : undefined}
								ariaLabel="{kind} warband{idxList.length > 1 ? ` ${pos + 1}` : ''}"
								placeholder="Select a warband"
							/>
						</div>
					{/each}

					<!-- one score block per side; in 2v2 the team shares it -->
					{#if idxList.length > 1}
						<p class="mb-2 font-display text-[9px] font-medium tracking-[0.1em] text-ink-faint uppercase">
							Shared team score
						</p>
					{/if}

					<div class="mb-2.5 grid grid-cols-[1fr_auto] items-end gap-2">
						<label class="flex flex-col gap-1.5">
							<span class={label}>› Primary</span>
							<input
								class="{control} text-right"
								type="number"
								min="0"
								inputmode="numeric"
								placeholder="—"
								bind:value={$form.combatants[lead].primaryVp}
							/>
						</label>
						<div class="flex flex-col gap-1.5 pb-2.5 text-right">
							<span class={label}>Total VP</span>
							<span class="font-body text-[15px] leading-none font-semibold text-accent">{total ?? '—'}</span>
						</div>
					</div>

					<div class="mb-3 flex flex-col gap-2">
						<Checkbox
							checked={(c.battleReadyVp ?? 0) === 10}
							onCheckedChange={(v) => patchCombatant(lead, { battleReadyVp: v ? 10 : 0 })}
							label="Battle-ready"
							hint="+10 VP"
						/>
						<Checkbox
							checked={$form.wentFirst === kind}
							onCheckedChange={(v) => ($form.wentFirst = v ? kind : null)}
							label="Went first"
						/>
					</div>

					<div class="flex flex-col gap-1.5">
						{#each c.secondaries ?? [] as sec, j (j)}
							<div class="grid grid-cols-[1fr_58px_30px] gap-1.5">
								<input
									class="{control} px-[9px] py-[7px] text-[12px]"
									type="text"
									placeholder="Secondary mission"
									maxlength="80"
									value={sec.name}
									oninput={(e) => patchSecondary(lead, j, { name: e.currentTarget.value })}
								/>
								<input
									class="{control} px-[9px] py-[7px] text-right text-[12px]"
									type="number"
									min="0"
									inputmode="numeric"
									aria-label="Secondary VP"
									value={sec.victoryPoints}
									oninput={(e) =>
										patchSecondary(lead, j, { victoryPoints: e.currentTarget.valueAsNumber || 0 })}
								/>
								<button
									type="button"
									aria-label="Remove secondary"
									onclick={() => removeSecondary(lead, j)}
									class="inline-flex items-center justify-center border border-border bg-panel-2 text-ink-faint transition-[color,border-color] duration-[120ms] hover:border-state-attacker-line hover:text-state-attacker [&_svg]:size-3"
								>
									<svg viewBox="0 0 14 14" aria-hidden="true"
										><path d="M3 3l8 8M11 3l-8 8" fill="none" stroke="currentColor" stroke-width="1.6" /></svg
									>
								</button>
							</div>
						{/each}
						{#if (c.secondaries?.length ?? 0) < 6}
							<button
								type="button"
								onclick={() => addSecondary(lead)}
								class="self-start border-0 bg-transparent py-[3px] font-display text-[10px] font-semibold tracking-[0.08em] text-ink-dim uppercase transition-colors hover:text-accent"
							>
								+ Add secondary
							</button>
						{/if}
					</div>
				</fieldset>
			{/snippet}

			<div class="grid grid-cols-2 items-start gap-3.5 max-[680px]:grid-cols-1">
				{@render sidePanel(attackerIdx, 'attacker', attackerVictor)}
				{@render sidePanel(defenderIdx, 'defender', defenderVictor)}
			</div>

			<div class="flex flex-col items-center gap-2.5 py-1">
				<span
					class="font-display text-[10px] font-semibold tracking-[0.1em] text-ink-faint uppercase"
					>› Outcome</span
				>
				<SegmentedField
					options={outcomeOptions}
					value={$form.outcome ?? ''}
					onValueChange={(v) => ($form.outcome = v as 'attacker' | 'defender' | 'stalemate')}
					ariaLabel="Outcome"
					class="w-full max-w-[520px]"
				/>
				{#if vpHint}<p class="text-center font-body text-[11.5px] text-state-contested">
						{vpHint}
					</p>{/if}
				{#if $errors.outcome}<p class="font-body text-[11.5px] text-state-attacker">
						{$errors.outcome}
					</p>{/if}
			</div>

			{#if $errors.combatants?._errors}
				<p
					class="border border-state-attacker-line bg-state-attacker-soft px-3 py-2.5 font-body text-[11.5px] text-state-attacker"
				>
					{$errors.combatants._errors}
				</p>
			{/if}

			<!-- ── Projection ────────────────────────────────────────── -->
			{#if preview}
				<section class={panel}>
					<h2 class={sec}>// Control Projection</h2>
					{#if preview.stalemate}
						<p class="text-[12.5px] text-ink-dim">
							A stalemate moves no control. {selectedWorld?.name} stays as it stands.
						</p>
					{:else}
						<p class="mb-3 text-[12.5px] text-ink-dim">
							If confirmed, control of {selectedWorld?.name} shifts:
						</p>
						<ul class="flex list-none flex-col gap-px">
							{#each preview.rows as row (row.id)}
								{@const delta = row.after - row.before}
								<li
									class="grid grid-cols-[12px_1fr_auto_auto] items-center gap-3 border-t border-border py-2.5 first:border-t-0"
								>
									<span class="size-[9px] shrink-0" style="background: {wbColor(row.id)}"></span>
									<span class="truncate font-body text-[13px] text-ink">{wbName(row.id)}</span>
									<span
										class="inline-flex items-center gap-[7px] font-body text-[12.5px] text-ink-dim"
									>
										<span>{row.before}%</span>
										<span class="text-ink-faint" aria-hidden="true">→</span>
										<b class="font-semibold text-ink">{row.after}%</b>
									</span>
									<span
										class="min-w-[42px] text-right font-display text-[11px] font-semibold tracking-[0.04em] {delta >
										0
											? 'text-accent'
											: delta < 0
												? 'text-state-attacker'
												: 'text-ink-faint'}"
									>
										{delta > 0 ? `+${delta}` : delta}%
									</span>
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			{/if}

			<!-- ── Intel ─────────────────────────────────────────────── -->
			<section class={panel}>
				<h2 class={sec}>// Intel</h2>
				<label class="flex flex-col gap-1.5">
					<span class={label}
						>› Planetary effect <span class="tracking-[0.06em] text-ink-faint">optional</span></span
					>
					<input
						class={control}
						type="text"
						maxlength="120"
						placeholder="e.g. Bloodlust (charge within 18″)"
						bind:value={$form.planetaryEffect}
					/>
				</label>
				<label class="mt-3.5 flex flex-col gap-1.5">
					<span class={label}
						>› Narrative <span class="tracking-[0.06em] text-ink-faint">optional</span></span
					>
					<textarea
						class="{control} resize-y leading-normal"
						rows="4"
						maxlength="4000"
						placeholder="What happened over this world?"
						bind:value={$form.narrative}
					></textarea>
				</label>

				<div class="mt-3.5 flex flex-col gap-2.5 border-t border-border pt-3.5">
					<span class={label}
						>› Score sheet <span class="tracking-[0.06em] text-ink-faint">coming soon</span></span
					>
					<div class="flex flex-wrap items-center gap-2.5">
						<input
							type="file"
							accept="image/*"
							onchange={onImagePick}
							class="max-w-full font-body text-[12px] text-ink-dim file:mr-2.5 file:cursor-pointer file:border file:border-border file:bg-panel-2 file:px-[11px] file:py-[7px] file:font-display file:text-[10px] file:tracking-[0.08em] file:text-ink-dim file:uppercase"
						/>
						<Button disabled>Auto-fill from photo</Button>
					</div>
					{#if imageFile}<p class="text-[12px] text-ink-dim">Selected: {imageFile.name}</p>{/if}
					<p class="text-[11.5px] leading-[1.45] text-ink-faint">
						A photo of the score sheet will draft the report for you to confirm.
					</p>
				</div>
			</section>

			<!-- ── Submit ────────────────────────────────────────────── -->
			<footer
				class="flex flex-wrap items-center justify-between gap-3.5 pt-1.5 max-[680px]:flex-col-reverse max-[680px]:items-stretch"
			>
				<p class="font-body text-[12px] text-ink-dim">
					{#if editing}
						{#if selectedWorld}Re-applies on save. Control of {selectedWorld.name} re-folds from the
							log.{:else}Select a world.{/if}
					{:else if selectedWorld}Applies immediately. Control of {selectedWorld.name} shifts on submit.{:else}Select
						a world to file the report.{/if}
				</p>
				<div class="flex gap-2.5 max-[680px]:justify-between">
					<Button variant="ghost" href={exitHref}>Cancel</Button>
					<Button type="submit" variant="primary" disabled={$submitting}>
						{#if editing}
							{$submitting ? 'Saving…' : 'Save changes'}
						{:else}
							{$submitting ? 'Logging…' : 'Submit battle report'}
						{/if}
					</Button>
				</div>
			</footer>
		</form>
	{/if}
</main>
