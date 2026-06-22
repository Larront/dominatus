<script lang="ts">
	import { computeStatBlock, type StatReport } from '$lib/domain/stat-block';
	import type { StatWarband, GalleryAward } from '$lib/server/standings';
	import Select from '$lib/components/ui/Select.svelte';
	import GalleryThumb from '$lib/components/ui/GalleryThumb.svelte';

	let {
		warbands,
		reports,
		viewerUserId = null,
		galleryImages = [],
		slug
	}: {
		warbands: StatWarband[];
		reports: StatReport[];
		viewerUserId?: string | null;
		/** Every award photo in the campaign, for the selected warband's painted-models strip (issue #14). */
		galleryImages?: GalleryAward[];
		slug: string;
	} = $props();

	// Selection is two axes, each a token: `cmd:<userId>` (all that commander's warbands) or
	// `wb:<id>` (one warband). The opponent axis also has `all` (the field-wide block, the default).
	const idsFor = (token: string): string[] => {
		if (token.startsWith('cmd:')) {
			const uid = token.slice(4);
			return warbands.filter((w) => w.commanderUserId === uid).map((w) => w.id);
		}
		if (token.startsWith('wb:')) return [token.slice(3)];
		return [];
	};

	// Commanders in first-appearance order, each with their warbands — so the selectors read grouped
	// by who commands what without disturbing the creation order the server hands us.
	const commanders = $derived.by(() => {
		const order: string[] = [];
		const byId = new Map<string, { userId: string; name: string; warbands: StatWarband[] }>();
		for (const w of warbands) {
			let entry = byId.get(w.commanderUserId);
			if (!entry) {
				entry = { userId: w.commanderUserId, name: w.commanderName, warbands: [] };
				byId.set(w.commanderUserId, entry);
				order.push(w.commanderUserId);
			}
			entry.warbands.push(w);
		}
		return order.map((id) => byId.get(id)!);
	});

	// Subject options: per commander, an "all warbands" aggregate (only when they have more than
	// one) followed by each of their warbands.
	const subjectItems = $derived(
		commanders.flatMap((c) => [
			...(c.warbands.length > 1
				? [{ value: `cmd:${c.userId}`, label: `${c.name} · all warbands` }]
				: []),
			...c.warbands.map((w) => ({ value: `wb:${w.id}`, label: w.name }))
		])
	);

	// Default the subject to the viewer's own warbands (issue #8 — "compare themselves to the
	// field"): their aggregate when they field more than one, the single warband when they field
	// one (the aggregate token isn't an option then), else the first warband in the list.
	const defaultSubject = $derived.by(() => {
		const mine = viewerUserId ? warbands.filter((w) => w.commanderUserId === viewerUserId) : [];
		if (mine.length > 1) return `cmd:${viewerUserId}`;
		if (mine.length === 1) return `wb:${mine[0].id}`;
		return subjectItems[0]?.value ?? '';
	});

	// Both axes are an override over a default rather than seeded state, so no $effect writes back:
	// `subject` falls back to the viewer's default, `opponent` to "all" whenever the override no
	// longer fits the current subject's opponent list.
	let subjectOverride = $state<string | null>(null);
	let opponentOverride = $state<string | null>(null);
	const subject = $derived(subjectOverride ?? defaultSubject);

	// The subject's commander — you never fight yourself, so their warbands are excluded from the
	// opponent list (facing them would always read zero games).
	const subjectCommander = $derived(
		subject.startsWith('cmd:')
			? subject.slice(4)
			: (warbands.find((w) => w.id === subject.slice(3))?.commanderUserId ?? '')
	);

	// Opponent options: all opponents (default), then every other commander (aggregate when they
	// field more than one) and their warbands.
	const opponentItems = $derived([
		{ value: 'all', label: 'All opponents' },
		...commanders
			.filter((c) => c.userId !== subjectCommander)
			.flatMap((c) => [
				...(c.warbands.length > 1
					? [{ value: `cmd:${c.userId}`, label: `${c.name} · all warbands` }]
					: []),
				...c.warbands.map((w) => ({ value: `wb:${w.id}`, label: w.name }))
			])
	]);

	// A held-over opponent that the new subject can't actually face falls back to "all".
	const opponent = $derived(
		opponentOverride && opponentItems.some((o) => o.value === opponentOverride)
			? opponentOverride
			: 'all'
	);

	const selfIds = $derived(idsFor(subject));
	const oppIds = $derived(opponent === 'all' ? undefined : idsFor(opponent));
	const block = $derived(computeStatBlock(reports, selfIds, oppIds));

	// The subject's painted-models photos (issue #14) — the awards on the warband(s) currently in
	// view, newest first (gallery order). Each thumbnail links into the gallery filtered to its
	// warband. The opponent axis is irrelevant here: this is the subject's own painting.
	const subjectImages = $derived(galleryImages.filter((img) => selfIds.includes(img.warbandId)));

	// A single-warband selection lends its colour to the select's leading swatch.
	const swatch = (token: string) =>
		token.startsWith('wb:') ? warbands.find((w) => w.id === token.slice(3))?.color : undefined;
	const opponentLabel = $derived(opponentItems.find((o) => o.value === opponent)?.label);
	const isHeadToHead = $derived(opponent !== 'all');

	const percent = (x: number | null) => (x == null ? '—' : Math.round(x * 100) + '%');
	const whole = (x: number | null) => (x == null ? '—' : Math.round(x).toString());
	const signed = (x: number | null) => (x == null ? '—' : (x > 0 ? '+' : '') + Math.round(x));

	const label = 'font-display text-[9.5px] tracking-[0.12em] text-ink-faint uppercase';

	// Dossier panels: each clusters its related lines under a section head, so the block reads
	// by theme (record / initiative / form / scoring) rather than as one flat field of tiles.
	const panel = 'border border-border bg-[color-mix(in_srgb,var(--color-panel)_70%,transparent)]';
	const panelHead =
		'border-b border-border px-3.5 py-2 font-display text-[9px] tracking-[0.14em] text-ink-faint uppercase';
	const row =
		'flex items-baseline justify-between gap-3 px-3.5 py-[9px] [&+&]:border-t [&+&]:border-border';
	const rowLabel = 'font-display text-[9.5px] tracking-[0.1em] text-ink-dim uppercase';
	const rowVal = 'font-body text-[15px] leading-none font-semibold text-ink tabular-nums';
</script>

<section class="mt-8">
	<h2 class="font-display text-[11px] font-semibold tracking-[0.14em] text-ink-dim uppercase">
		<span class="text-accent">▸</span> Statistics
		{#if isHeadToHead}
			<span class="text-ink-faint normal-case">· head-to-head</span>
		{/if}
	</h2>

	<div class="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
		<label class="flex flex-col gap-1.5">
			<span class={label}>Warband</span>
			<Select
				items={subjectItems}
				value={subject}
				onValueChange={(v) => (subjectOverride = v)}
				leadColor={swatch(subject)}
				ariaLabel="Warband to view"
			/>
		</label>
		<span
			class="hidden pb-2.5 text-center font-display text-[10px] tracking-[0.12em] text-ink-faint uppercase sm:block"
			aria-hidden="true">vs</span
		>
		<label class="flex flex-col gap-1.5">
			<span class={label}>Versus</span>
			<Select
				items={opponentItems}
				value={opponent}
				onValueChange={(v) => (opponentOverride = v)}
				leadColor={swatch(opponent)}
				ariaLabel="Opponent filter"
			/>
		</label>
	</div>

	{#if block.played === 0}
		<p class="mt-4 font-body text-[13px] text-ink-dim">
			{#if isHeadToHead}
				No games against {opponentLabel} yet.
			{:else}
				No games logged yet.
			{/if}
		</p>
	{:else}
		<div class="mt-4 grid gap-3 sm:grid-cols-2">
			<div class={panel}>
				<div class={panelHead}>Record</div>
				<dl class="flex flex-col">
					<div class={row}>
						<dt class={rowLabel}>Played</dt>
						<dd class={rowVal}>{block.played}</dd>
					</div>
					<div class={row}>
						<dt class={rowLabel}>W–D–L</dt>
						<dd class={rowVal}>{block.wins}–{block.draws}–{block.losses}</dd>
					</div>
					<div class={row}>
						<dt class={rowLabel}>Win rate</dt>
						<dd class="{rowVal} text-accent">{percent(block.winRate)}</dd>
					</div>
				</dl>
			</div>

			<div class={panel}>
				<div class={panelHead}>Initiative</div>
				<dl class="flex flex-col">
					<div class={row}>
						<dt class={rowLabel}>Win · go first</dt>
						<dd class={rowVal}>{percent(block.firstWinRate)}</dd>
					</div>
					<div class={row}>
						<dt class={rowLabel}>Win · go second</dt>
						<dd class={rowVal}>{percent(block.secondWinRate)}</dd>
					</div>
				</dl>
			</div>

			<div class={panel}>
				<div class={panelHead}>Form</div>
				<dl class="flex flex-col">
					<div class={row}>
						<dt class={rowLabel}>Current streak</dt>
						<dd class={rowVal}>{block.currentStreak}</dd>
					</div>
					<div class={row}>
						<dt class={rowLabel}>Best streak</dt>
						<dd class={rowVal}>{whole(block.longestStreak)}</dd>
					</div>
				</dl>
			</div>

			<div class={panel}>
				<div class={panelHead}>Scoring</div>
				<dl class="flex flex-col">
					<div class={row}>
						<dt class={rowLabel}>Avg VP · won</dt>
						<dd class={rowVal}>{whole(block.avgVpInWins)}</dd>
					</div>
					<div class={row}>
						<dt class={rowLabel}>Avg VP · lost</dt>
						<dd class={rowVal}>{whole(block.avgVpInLosses)}</dd>
					</div>
					<div class={row}>
						<dt class={rowLabel}>Loss margin</dt>
						<dd class={rowVal}>{signed(block.lossDifferential)}</dd>
					</div>
				</dl>
			</div>
		</div>
	{/if}

	{#if subjectImages.length > 0}
		<!-- The subject's painted models — a strip of award photos linking into the gallery (issue #14). -->
		<div class="mt-4">
			<div class={label}>Painted models</div>
			<ul class="mt-2 flex flex-wrap gap-2">
				{#each subjectImages as img (img.id)}
					<li>
						<GalleryThumb
							{slug}
							imagePath={img.imagePath}
							warbandId={img.warbandId}
							warbandName={img.warbandName}
							note={img.note}
						/>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>
