<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { superForm } from 'sveltekit-superforms';
	import { fadeRise, scaleFade } from '$lib/motion';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import SegmentedField from '$lib/components/ui/SegmentedField.svelte';
	import DestructiveForm from '$lib/components/ui/DestructiveForm.svelte';
	import AwardImage from '$lib/components/ui/AwardImage.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const kindLabel: Record<string, string> = {
		unit: 'Unit',
		character: 'Character / vehicle',
		terrain: 'Terrain / display'
	};

	// The distinct warbands with at least one photo, in name order — the filter's options. Derived
	// from the images themselves so a warband only appears once it has something to show.
	const warbands = $derived.by(() => {
		const byId = new Map<string, { id: string; name: string; short: string; color: string }>();
		for (const img of data.images) {
			if (!byId.has(img.warbandId)) {
				byId.set(img.warbandId, {
					id: img.warbandId,
					name: img.warbandName,
					short: img.warbandShort,
					color: img.warbandColor
				});
			}
		}
		return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
	});

	// The filter is an override over the URL's `?warband=` deep link (set by chronicle/stat-block
	// thumbnails), which itself falls back to "all". A stale param — or one whose warband has no
	// photos — reads as "all" rather than an empty grid.
	let selectedOverride = $state<string | null>(null);
	const fromUrl = $derived(page.url.searchParams.get('warband'));
	const selected = $derived(
		selectedOverride ?? (fromUrl && warbands.some((w) => w.id === fromUrl) ? fromUrl : 'all')
	);

	const filtered = $derived(
		selected === 'all' ? data.images : data.images.filter((img) => img.warbandId === selected)
	);

	// Lightbox: clicking a thumbnail opens the photo in an overlay (the signature gallery moment),
	// rather than dumping the raw image into a new tab. Indexes into the *filtered* set so prev/next
	// step through what's on screen. The thumbnail stays an <a href> so no-JS still opens the image.
	let lightboxIndex = $state<number | null>(null);
	const lightboxImg = $derived(lightboxIndex == null ? null : (filtered[lightboxIndex] ?? null));
	let closeButton = $state<HTMLButtonElement>();

	const openLightbox = (i: number) => (lightboxIndex = i);
	const closeLightbox = () => (lightboxIndex = null);
	const lightboxStep = (delta: number) => {
		if (lightboxIndex == null || filtered.length === 0) return;
		lightboxIndex = (lightboxIndex + delta + filtered.length) % filtered.length;
	};
	const onLightboxKey = (e: KeyboardEvent) => {
		if (lightboxIndex == null) return;
		if (e.key === 'Escape') closeLightbox();
		else if (e.key === 'ArrowLeft') lightboxStep(-1);
		else if (e.key === 'ArrowRight') lightboxStep(1);
	};
	// Move focus into the dialog on open so the overlay is keyboard-operable and Escape/arrows land.
	$effect(() => {
		if (lightboxImg) closeButton?.focus();
	});

	const chip =
		'border px-2.5 py-1 font-display text-[10px] font-semibold tracking-[0.08em] uppercase transition-[color,border-color,background-color] duration-[120ms]';

	// The optional painting photo rides alongside the grant form's flat fields — picked here and
	// appended to the multipart body on submit (the schema doesn't model the file).
	let awardImageFile = $state<File | null>(null);

	// Award form (arbiter only, Superforms). `id: 'award'` scopes it so the plain revoke action's
	// response never feeds back here. Select/SegmentedField aren't native controls, so hidden inputs
	// carry their bound store values into the POST body.
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

	// Inline edit (arbiter): one award row at a time switches to an editor seeded with its current
	// fields. Local state rather than Superforms — the editor posts to `?/editAward` via native
	// enhance, matching the per-row image/revoke controls. Closes on a successful save.
	type AwardKind = 'unit' | 'character' | 'terrain';
	let editingId = $state<string | null>(null);
	let editWarbandId = $state('');
	let editKind = $state<AwardKind>('unit');
	let editNote = $state('');

	const startEdit = (a: {
		id: string;
		warbandId: string;
		kind: AwardKind;
		note: string | null;
	}) => {
		editingId = a.id;
		editWarbandId = a.warbandId;
		editKind = a.kind;
		editNote = a.note ?? '';
	};
	const cancelEdit = () => (editingId = null);

	// The edit action's error for this row, matched by id (parallel to imageError).
	const editError = (id: string): string | undefined =>
		form && 'editId' in form && form.editId === id ? (form.editError ?? undefined) : undefined;
</script>

<svelte:window onkeydown={onLightboxKey} />

<main class="mx-auto w-full max-w-5xl px-6 py-8 max-[720px]:px-4">
	<header class="mb-6">
		<h1 class="font-display text-2xl font-bold tracking-[0.02em] text-accent">Gallery</h1>
		<p class="mt-1 font-body text-[13px] leading-[1.5] text-ink-dim">
			The campaign's painted models — every painting award with a photo. Filter by warband to see a
			single force's work.
		</p>
	</header>

	{#if data.images.length === 0}
		<p
			class="border border-border bg-[color-mix(in_srgb,var(--color-panel)_70%,transparent)] px-4 py-10 text-center font-body text-[13px] text-ink-dim"
		>
			No painted-models photos yet. Once an award carries a photo, it appears here.
		</p>
	{:else}
		<!-- Warband filter: "All" plus a chip per warband that has photos. -->
		<div class="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter by warband">
			<button
				type="button"
				onclick={() => (selectedOverride = 'all')}
				aria-pressed={selected === 'all'}
				class="{chip} {selected === 'all'
					? 'border-accent-mid bg-accent-soft text-accent'
					: 'border-border bg-panel-2 text-ink-dim hover:text-accent'}"
			>
				All
			</button>
			{#each warbands as wb (wb.id)}
				<button
					type="button"
					onclick={() => (selectedOverride = wb.id)}
					aria-pressed={selected === wb.id}
					title={wb.name}
					class="{chip} inline-flex items-center gap-1.5 {selected === wb.id
						? 'border-accent-mid bg-accent-soft text-accent'
						: 'border-border bg-panel-2 text-ink-dim hover:text-accent'}"
				>
					<span class="size-2 shrink-0" style="background: {wb.color}"></span>
					{wb.short}
				</button>
			{/each}
		</div>

		<ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
			{#each filtered as img, i (img.id)}
				{@const src = `/campaigns/${data.slug}/award/image/${img.imagePath}`}
				<li class="flex flex-col border border-border bg-panel-2/60">
					<a
						href={src}
						onclick={(e) => {
							e.preventDefault();
							openLightbox(i);
						}}
						class="group block cursor-zoom-in overflow-hidden"
						aria-label="View painted models — {img.warbandName}{img.note ? `, ${img.note}` : ''}"
					>
						<img
							{src}
							alt="Painted models — {img.warbandName}{img.note ? `, ${img.note}` : ''}"
							loading="lazy"
							class="aspect-square w-full border-b border-border object-cover transition-transform duration-[var(--dur-base)] ease-snap group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
						/>
					</a>
					<div class="flex min-w-0 flex-col gap-1 p-3">
						<span
							class="inline-flex items-center gap-1.5 font-display text-[11px] font-semibold tracking-[0.06em] uppercase"
							title={img.warbandName}
						>
							<span class="size-2 shrink-0" style="background: {img.warbandColor}"></span>
							<span class="truncate text-ink">{img.warbandName}</span>
						</span>
						<span class="font-body text-[12px] text-ink-dim">{kindLabel[img.kind] ?? img.kind}</span
						>
						{#if img.note}
							<span class="font-body text-[12px] leading-[1.4] text-ink-faint">{img.note}</span>
						{/if}
						<span
							class="mt-0.5 font-display text-[9.5px] tracking-[0.12em] text-ink-faint uppercase"
						>
							Cycle {img.cycle}
						</span>
					</div>
				</li>
			{/each}
		</ul>
	{/if}

	{#if lightboxImg}
		{@const src = `/campaigns/${data.slug}/award/image/${lightboxImg.imagePath}`}
		<!-- Lightbox overlay: scrim fades, the figure scales in. Click-out / Escape / × all close;
		     ←/→ step through the filtered set. Transitions come from motion.ts so reduced-motion is
		     honoured (Svelte's JS transitions ignore the global CSS rule). -->
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-void)_90%,transparent)] p-4 backdrop-blur-[6px] max-[720px]:p-3"
			transition:fadeRise={{ y: 0 }}
			onclick={closeLightbox}
			role="presentation"
		>
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<div
				class="relative flex max-h-full max-w-3xl flex-col focus:outline-none"
				role="dialog"
				aria-modal="true"
				aria-label="Painted models — {lightboxImg.warbandName}"
				tabindex="-1"
				transition:scaleFade
				onclick={(e) => e.stopPropagation()}
			>
				<img
					{src}
					alt="Painted models — {lightboxImg.warbandName}{lightboxImg.note
						? `, ${lightboxImg.note}`
						: ''}"
					class="max-h-[78vh] w-auto border border-border object-contain"
				/>

				<div
					class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-accent-mid pl-3 font-body text-[13px]"
				>
					<span class="inline-flex items-center gap-1.5 font-display text-[12px] uppercase">
						<span class="size-2 shrink-0" style="background: {lightboxImg.warbandColor}"></span>
						<span class="text-ink">{lightboxImg.warbandName}</span>
					</span>
					<span class="text-ink-dim">{kindLabel[lightboxImg.kind] ?? lightboxImg.kind}</span>
					{#if lightboxImg.note}<span class="text-ink-faint">— {lightboxImg.note}</span>{/if}
					<span
						class="ml-auto font-display text-[9.5px] tracking-[0.12em] text-ink-faint uppercase"
					>
						Cycle {lightboxImg.cycle}
					</span>
				</div>

				<button
					type="button"
					bind:this={closeButton}
					onclick={closeLightbox}
					aria-label="Close"
					class="absolute -top-2 -right-2 flex size-9 items-center justify-center border border-border bg-panel text-ink-dim transition-colors duration-[var(--dur-fast)] hover:border-border-lum hover:text-accent focus-visible:border-accent focus-visible:text-accent focus-visible:outline-none"
				>
					<svg viewBox="0 0 20 20" class="size-[18px]" aria-hidden="true">
						<path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.6" fill="none" />
					</svg>
				</button>

				{#if filtered.length > 1}
					<button
						type="button"
						onclick={() => lightboxStep(-1)}
						aria-label="Previous"
						class="absolute top-1/2 -left-2 flex size-9 -translate-y-1/2 items-center justify-center border border-border bg-panel text-ink-dim transition-colors duration-[var(--dur-fast)] hover:border-border-lum hover:text-accent focus-visible:border-accent focus-visible:text-accent focus-visible:outline-none max-[720px]:-left-1"
					>
						<svg viewBox="0 0 20 20" class="size-[18px]" aria-hidden="true">
							<path
								d="M12 4l-6 6 6 6"
								stroke="currentColor"
								stroke-width="1.7"
								fill="none"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>
					<button
						type="button"
						onclick={() => lightboxStep(1)}
						aria-label="Next"
						class="absolute top-1/2 -right-2 flex size-9 -translate-y-1/2 items-center justify-center border border-border bg-panel text-ink-dim transition-colors duration-[var(--dur-fast)] hover:border-border-lum hover:text-accent focus-visible:border-accent focus-visible:text-accent focus-visible:outline-none max-[720px]:-right-1"
					>
						<svg viewBox="0 0 20 20" class="size-[18px]" aria-hidden="true">
							<path
								d="M8 4l6 6-6 6"
								stroke="currentColor"
								stroke-width="1.7"
								fill="none"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>
				{/if}
			</div>
		</div>
	{/if}

	{#if data.isArbiter}
		<!-- Arbiter award panel: grant painting points the report log can't capture. -->
		<section class="mt-10 border border-border bg-panel-2/60 p-5">
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
							{#if editingId === a.id}
								<!-- Inline editor: correct the warband, kind, or note in place. -->
								<form
									method="POST"
									action="?/editAward"
									class="flex flex-col gap-2.5"
									use:enhance={() => {
										return async ({ update, result }) => {
											await update();
											if (result.type === 'success') editingId = null;
										};
									}}
								>
									<input type="hidden" name="id" value={a.id} />
									<input type="hidden" name="warbandId" value={editWarbandId} />
									<input type="hidden" name="kind" value={editKind} />
									<div class="grid gap-2.5 sm:grid-cols-2">
										<Select
											items={warbandItems}
											bind:value={editWarbandId}
											ariaLabel="Warband"
											leadColor={data.warbands.find((w) => w.id === editWarbandId)?.color}
										/>
										<SegmentedField
											options={kindOptions}
											value={editKind}
											onValueChange={(v) => (editKind = v as AwardKind)}
											ariaLabel="What was painted"
										/>
									</div>
									<input
										name="note"
										bind:value={editNote}
										placeholder="Note (optional) — e.g. Hierophant Bio-Titan"
										class="border border-border bg-void px-3 py-2.5 font-body text-[13px] text-ink transition-[border-color,box-shadow]
											duration-[120ms] placeholder:text-ink-faint focus-visible:border-accent
											focus-visible:shadow-[0_0_0_1px_var(--color-accent-mid)] focus-visible:outline-none"
									/>
									<div class="flex items-center gap-2">
										<Button type="submit" variant="primary">Save</Button>
										<button
											type="button"
											onclick={cancelEdit}
											class="border border-border bg-panel-2 px-2.5 py-1.5 font-display text-[10px] tracking-[0.08em] text-ink-dim uppercase transition-colors hover:border-border-lum hover:text-accent focus-visible:outline-none"
										>
											Cancel
										</button>
										{#if editError(a.id)}
											<span class="font-body text-[12px] text-state-attacker"
												>{editError(a.id)}</span
											>
										{/if}
									</div>
								</form>
							{:else}
								<div class="flex items-center gap-3">
									<span class="size-2 shrink-0" style="background: {a.warbandColor}"></span>
									<span class="text-ink">{a.warbandName}</span>
									<span class="text-ink-dim">{kindLabel[a.kind] ?? a.kind}</span>
									{#if a.note}<span class="truncate text-ink-faint">— {a.note}</span>{/if}
									<span class="ml-auto shrink-0 font-semibold text-accent tabular-nums"
										>+{a.points}</span
									>
									<button
										type="button"
										onclick={() => startEdit(a)}
										aria-label="Edit award for {a.warbandName}"
										class="shrink-0 border border-transparent px-1.5 py-0.5 font-display text-[10px] tracking-[0.08em] text-ink-faint uppercase transition-colors hover:border-accent-mid hover:text-accent focus-visible:outline-none"
									>
										Edit
									</button>
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
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}

	{#if !data.isArbiter && data.myAwards.length}
		<!-- A commander curates the painted-models photo on their own warbands' awards. -->
		<section class="mt-10 border border-border bg-panel-2/60 p-5">
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
