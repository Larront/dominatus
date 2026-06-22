<script lang="ts">
	import { computeStatBlock, type StatReport } from '$lib/domain/stat-block';
	import SegmentedField from '$lib/components/ui/SegmentedField.svelte';

	let {
		myWarbands,
		reports
	}: {
		myWarbands: { id: string; name: string; short: string; color: string }[];
		reports: StatReport[];
	} = $props();

	let filter = $state('all');

	const self = $derived(filter === 'all' ? myWarbands.map((w) => w.id) : [filter]);
	const block = $derived(computeStatBlock(reports, self));

	const filterOptions = $derived([
		{ value: 'all', label: 'All' },
		...myWarbands.map((w) => ({ value: w.id, label: w.short }))
	]);

	const percent = (x: number | null) => (x == null ? '—' : Math.round(x * 100) + '%');
	const whole = (x: number | null) => (x == null ? '—' : Math.round(x).toString());
	const signed = (x: number | null) => (x == null ? '—' : (x > 0 ? '+' : '') + Math.round(x));

	const tile = 'bg-[color-mix(in_srgb,var(--color-panel)_70%,transparent)] px-3 py-3';
	const label = 'font-display text-[9.5px] tracking-[0.12em] text-ink-faint uppercase';
	const value = 'font-body text-[18px] font-semibold text-ink tabular-nums';
</script>

<section class="mt-8">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h2 class="font-display text-[11px] font-semibold tracking-[0.14em] text-ink-dim uppercase">
			<span class="text-accent">▸</span> Statistics
		</h2>
		{#if myWarbands.length > 1}
			<SegmentedField
				options={filterOptions}
				value={filter}
				onValueChange={(v) => (filter = v)}
				ariaLabel="Filter statistics by warband"
			/>
		{/if}
	</div>

	{#if block.played === 0}
		<p class="mt-4 font-body text-[13px] text-ink-dim">No games logged yet.</p>
	{:else}
		<div class="mt-4 grid grid-cols-2 gap-px bg-border sm:grid-cols-3 md:grid-cols-4">
			<div class={tile}>
				<div class={label}>Played</div>
				<div class={value}>{block.played}</div>
			</div>
			<div class={tile}>
				<div class={label}>Record</div>
				<div class={value}>{block.wins}–{block.draws}–{block.losses}</div>
			</div>
			<div class={tile}>
				<div class={label}>Win rate</div>
				<div class="{value} text-accent">{percent(block.winRate)}</div>
			</div>
			<div class={tile}>
				<div class={label}>Go first</div>
				<div class={value}>{percent(block.firstWinRate)}</div>
			</div>
			<div class={tile}>
				<div class={label}>Go second</div>
				<div class={value}>{percent(block.secondWinRate)}</div>
			</div>
			<div class={tile}>
				<div class={label}>Streak</div>
				<div class={value}>
					{block.currentStreak}
					<span class="text-[10px] text-ink-faint">best {whole(block.longestStreak)}</span>
				</div>
			</div>
			<div class={tile}>
				<div class={label}>Avg VP · won</div>
				<div class={value}>{whole(block.avgVpInWins)}</div>
			</div>
			<div class={tile}>
				<div class={label}>Avg VP · lost</div>
				<div class={value}>{whole(block.avgVpInLosses)}</div>
			</div>
			<div class={tile}>
				<div class={label}>Loss margin</div>
				<div class={value}>{signed(block.lossDifferential)}</div>
			</div>
		</div>
	{/if}
</section>
