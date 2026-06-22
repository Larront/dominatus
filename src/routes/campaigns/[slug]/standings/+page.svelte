<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import SegmentedField from '$lib/components/ui/SegmentedField.svelte';
	import DestructiveForm from '$lib/components/ui/DestructiveForm.svelte';
	import AwardImage from '$lib/components/ui/AwardImage.svelte';
	import WarbandStats from '$lib/components/WarbandStats.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// The optional painting photo rides alongside the grant form's flat fields — picked here and
	// appended to the multipart body on submit (the schema doesn't model the file).
	let awardImageFile = $state<File | null>(null);

	// Award form (arbiter only, Superforms). `id: 'award'` scopes it so the plain revoke action's
	// response never feeds back here. Select/SegmentedField aren't native controls, so hidden
	// inputs carry their bound store values into the POST body.
	const {
		form: award,
		errors: awardErrors,
		message: awardMessage,
		submitting: granting,
		enhance: awardEnhance
	} = untrack(() =>
		superForm(data.awardForm, {
			id: 'award',
			onSubmit({ formData }) {
				if (awardImageFile) formData.set('image', awardImageFile);
			}
		})
	);

	// An award-image action returns `{ awardId, imageError }` on failure; surface it on its own row.
	const imageError = (id: string): string | undefined =>
		form && 'awardId' in form && form.awardId === id ? (form.imageError ?? undefined) : undefined;

	const warbandItems = $derived(data.warbands.map((w) => ({ value: w.id, label: w.name })));
	const leadColor = $derived(data.warbands.find((w) => w.id === $award.warbandId)?.color);

	const kindOptions = [
		{ value: 'unit', label: 'Unit · 1' },
		{ value: 'character', label: 'Char / Vehicle · 2' },
		{ value: 'terrain', label: 'Terrain · 1' }
	];

	const kindLabel: Record<string, string> = {
		unit: 'Unit',
		character: 'Character / vehicle',
		terrain: 'Terrain / display'
	};

	// Breakdown columns are driven by the campaign's scoring profile, so a zeroed category never
	// shows a dead column. Commanders see only active categories; the arbiter sees every category
	// (the off ones dimmed) so they know what they can turn on. Header and rows share this list.
	type ColKey =
		| 'win'
		| 'draw'
		| 'loss'
		| 'underdog'
		| 'narrative'
		| 'streak'
		| 'kingkiller'
		| 'milestone'
		| 'painting';
	const p = $derived(data.profile);
	const columns = $derived(
		(
			[
				{ key: 'win', label: 'Win', on: p.win > 0, title: `+${p.win} per win` },
				{ key: 'draw', label: 'Draw', on: p.draw > 0, title: `+${p.draw} per draw` },
				{ key: 'loss', label: 'Loss', on: p.loss > 0, title: `+${p.loss} per loss` },
				{
					key: 'underdog',
					label: 'Under',
					on: p.underdog > 0,
					title: `+${p.underdog} beating a bigger holder`
				},
				{
					key: 'narrative',
					label: 'Narr',
					on: p.narrative > 0,
					title: `+${p.narrative} for a narrative log`
				},
				{
					key: 'streak',
					label: 'Streak',
					on: p.streakBonus > 0,
					title: `+${p.streakBonus} every ${p.streakLength} wins in a row`
				},
				{
					key: 'kingkiller',
					label: 'King',
					on: p.kingkiller > 0,
					title: `+${p.kingkiller} for ending a win streak`
				},
				{
					key: 'milestone',
					label: 'Ctrl',
					on: p.milestonePoints > 0,
					title: `+${p.milestonePoints} per ${p.milestoneStep}% control banked`
				},
				{
					key: 'painting',
					label: 'Paint',
					on: p.paintUnit > 0 || p.paintCharacter > 0 || p.paintTerrain > 0,
					title: 'Arbiter painting awards'
				}
			] satisfies { key: ColKey; label: string; on: boolean; title: string }[]
		).filter((c) => data.isArbiter || c.on)
	);
</script>

<main class="mx-auto w-full max-w-3xl px-6 py-8 max-[720px]:px-4">
	<header class="mb-6">
		<h1 class="font-display text-2xl font-bold tracking-[0.02em] text-accent">Standings</h1>
		<p class="mt-1 font-body text-[13px] leading-[1.5] text-ink-dim">
			Campaign points — separate from world control. Each column is a scoring category set by the
			arbiter; hover one to see what it's worth. The full charter is on the
			<a href="rules" class="text-accent underline-offset-2 hover:underline">Rules</a> page.
		</p>
	</header>

	<!-- Standings table -->
	<div
		class="overflow-x-auto border border-border bg-[color-mix(in_srgb,var(--color-panel)_70%,transparent)]"
	>
		<table class="w-full border-collapse font-body text-[13px]">
			<thead>
				<tr
					class="border-b border-border text-left font-display text-[9.5px] tracking-[0.12em] text-ink-faint uppercase"
				>
					<th class="w-10 px-3 py-2.5 text-right font-medium">#</th>
					<th class="px-3 py-2.5 font-medium">Warband</th>
					{#each columns as col (col.key)}
						<th
							class="w-12 px-2 py-2.5 text-right font-medium max-[640px]:hidden {col.on
								? ''
								: 'text-ink-faint/40'}"
							title="{col.title}{col.on ? '' : ' · off'}"
						>
							{col.label}
						</th>
					{/each}
					<th class="w-14 px-3 py-2.5 text-right font-semibold text-ink-dim">Pts</th>
				</tr>
			</thead>
			<tbody>
				{#each data.standings as wb, i (wb.id)}
					<tr
						class="border-t border-border transition-colors first:border-t-0 hover:bg-accent-soft/40"
					>
						<td class="px-3 py-2.5 text-right font-display text-[12px] text-ink-faint tabular-nums">
							{i + 1}
						</td>
						<td class="px-3 py-2.5">
							<span class="flex min-w-0 items-center gap-2.5">
								<span
									class="size-[11px] shrink-0 shadow-[0_0_8px_currentColor]"
									style="color: {wb.color}; background: {wb.color}"
								></span>
								<span class="truncate text-ink">{wb.name}</span>
								{#if wb.you}
									<span
										class="shrink-0 border border-accent-mid px-1 py-0.5 font-display text-[8.5px] font-semibold tracking-[0.08em] text-accent uppercase"
									>
										You
									</span>
								{/if}
							</span>
						</td>
						{#each columns as col (col.key)}
							<td
								class="px-2 py-2.5 text-right tabular-nums max-[640px]:hidden {wb[col.key]
									? 'text-ink-dim'
									: 'text-ink-faint/50'}"
							>
								{wb[col.key] || '·'}
							</td>
						{/each}
						<td
							class="px-3 py-2.5 text-right font-body text-[15px] font-semibold text-accent tabular-nums"
						>
							{wb.total}
						</td>
					</tr>
				{:else}
					<tr>
						<td
							colspan={columns.length + 3}
							class="px-3 py-8 text-center font-body text-[13px] text-ink-dim"
						>
							No warbands have mustered yet.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if data.myWarbands.length > 0}
		<WarbandStats myWarbands={data.myWarbands} reports={data.statReports} />
	{/if}

	{#if data.isArbiter}
		<!-- Arbiter award panel: grant painting points the report log can't capture. -->
		<section class="mt-8 border border-border bg-panel-2/60 p-5">
			<h2 class="font-display text-[11px] font-semibold tracking-[0.14em] text-ink-dim uppercase">
				<span class="text-accent">▸</span> Grant painting award
			</h2>

			<form
				method="POST"
				action="?/grantAward"
				enctype="multipart/form-data"
				class="mt-4 grid grid-cols-[1fr_auto] gap-3 max-[640px]:grid-cols-1"
				use:awardEnhance
			>
				<input type="hidden" name="warbandId" value={$award.warbandId} />
				<input type="hidden" name="kind" value={$award.kind} />

				<div class="flex flex-col gap-3">
					<Select
						items={warbandItems}
						bind:value={$award.warbandId}
						placeholder="Select warband…"
						ariaLabel="Warband to award"
						{leadColor}
					/>
					<SegmentedField
						options={kindOptions}
						value={$award.kind}
						onValueChange={(v) => ($award.kind = v as typeof $award.kind)}
						ariaLabel="What was painted"
					/>
					<input
						name="note"
						bind:value={$award.note}
						placeholder="Note (optional) — e.g. Hierophant Bio-Titan"
						class="border border-border bg-void px-3 py-2.5 font-body text-[13px] text-ink transition-[border-color,box-shadow]
							duration-[120ms] placeholder:text-ink-faint focus-visible:border-accent
							focus-visible:shadow-[0_0_0_1px_var(--color-accent-mid)] focus-visible:outline-none"
					/>
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp"
						onchange={(e) => (awardImageFile = e.currentTarget.files?.[0] ?? null)}
						aria-label="Painted models photo (optional)"
						class="max-w-full font-body text-[12px] text-ink-dim file:mr-2.5 file:cursor-pointer file:border file:border-border file:bg-panel-2 file:px-[11px] file:py-[7px] file:font-display file:text-[10px] file:tracking-[0.08em] file:text-ink-dim file:uppercase"
					/>
				</div>

				<div class="flex items-start max-[640px]:items-stretch">
					<Button
						type="submit"
						variant="primary"
						disabled={!$award.warbandId || $granting}
						class="max-[640px]:w-full"
					>
						{$granting ? 'Granting…' : 'Grant'}
					</Button>
				</div>
			</form>

			{#if $awardErrors.warbandId}
				<p class="mt-3 font-body text-[12px] text-state-attacker">{$awardErrors.warbandId}</p>
			{:else if $awardErrors._errors}
				<!-- A bad image (wrong type/oversize) surfaces as a form-level error, like the report form. -->
				<p class="mt-3 font-body text-[12px] text-state-attacker">
					{$awardErrors._errors.join(' ')}
				</p>
			{:else if $awardMessage}
				<p class="mt-3 font-body text-[12px] text-accent">{$awardMessage}</p>
			{/if}

			{#if data.awards.length}
				<ul class="mt-5 flex flex-col">
					{#each data.awards as a (a.id)}
						<li
							class="flex flex-col border-t border-border py-2.5 font-body text-[13px] first:border-t-0"
						>
							<div class="flex items-center gap-3">
								<span class="size-2 shrink-0" style="background: {a.warbandColor}"></span>
								<span class="text-ink">{a.warbandName}</span>
								<span class="text-ink-dim">{kindLabel[a.kind] ?? a.kind}</span>
								{#if a.note}<span class="truncate text-ink-faint">— {a.note}</span>{/if}
								<span class="ml-auto shrink-0 font-semibold text-accent tabular-nums"
									>+{a.points}</span
								>
								<DestructiveForm
									form={data.revokeForm}
									formId="revoke-{a.id}"
									action="?/revokeAward"
									recordId={a.id}
									ariaLabel="Revoke award for {a.warbandName}"
									class="shrink-0 border border-transparent px-1.5 py-0.5 font-display text-[10px] tracking-[0.08em] text-ink-faint uppercase
										transition-colors hover:border-state-attacker-line hover:text-state-attacker focus-visible:outline-none"
								>
									Revoke
								</DestructiveForm>
							</div>
							<AwardImage
								awardId={a.id}
								imagePath={a.imagePath}
								slug={data.slug}
								removeForm={data.revokeForm}
								error={imageError(a.id)}
							/>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}

	{#if !data.isArbiter && data.myAwards.length}
		<!-- A commander curates the painted-models photo on their own warbands' awards. -->
		<section class="mt-8 border border-border bg-panel-2/60 p-5">
			<h2 class="font-display text-[11px] font-semibold tracking-[0.14em] text-ink-dim uppercase">
				<span class="text-accent">▸</span> Your painting awards
			</h2>
			<p class="mt-1.5 font-body text-[12px] leading-[1.5] text-ink-dim">
				Attach a photo of the painted models — the arbiter grants the award itself.
			</p>
			<ul class="mt-4 flex flex-col">
				{#each data.myAwards as a (a.id)}
					<li
						class="flex flex-col border-t border-border py-2.5 font-body text-[13px] first:border-t-0"
					>
						<div class="flex items-center gap-3">
							<span class="size-2 shrink-0" style="background: {a.warbandColor}"></span>
							<span class="text-ink">{a.warbandName}</span>
							<span class="text-ink-dim">{kindLabel[a.kind] ?? a.kind}</span>
							{#if a.note}<span class="truncate text-ink-faint">— {a.note}</span>{/if}
							<span class="ml-auto shrink-0 font-semibold text-accent tabular-nums"
								>+{a.points}</span
							>
						</div>
						<AwardImage
							awardId={a.id}
							imagePath={a.imagePath}
							slug={data.slug}
							removeForm={data.revokeForm}
							error={imageError(a.id)}
						/>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</main>
