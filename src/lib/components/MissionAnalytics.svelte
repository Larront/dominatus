<script lang="ts">
	import type { MissionAnalytics, MissionStat } from '$lib/domain/mission-analytics';

	let { analytics }: { analytics: MissionAnalytics } = $props();

	const hasData = $derived(analytics.primaries.length > 0 || analytics.secondaries.length > 0);

	const percent = (x: number) => Math.round(x * 100) + '%';
	const score = (x: number | null) => (x == null ? '—' : Math.round(x).toString());

	const label = 'font-display text-[9.5px] tracking-[0.12em] text-ink-faint uppercase';

	// Each breakdown is a compact four-column grid: mission (flexes + truncates) then the three
	// numeric columns (fixed, tabular). The name column carrying the slack is what keeps it readable
	// on a narrow screen — the numbers stay put, the title ellipsises.
	const breakdowns = $derived([
		{ title: 'Primary missions', rows: analytics.primaries },
		{ title: 'Secondary missions', rows: analytics.secondaries }
	] satisfies { title: string; rows: MissionStat[] }[]);
</script>

<section class="mt-8">
	<h2 class="font-display text-[11px] font-semibold tracking-[0.14em] text-ink-dim uppercase">
		<span class="text-accent">▸</span> Mission analytics
		<span class="text-ink-faint normal-case">· campaign-wide</span>
	</h2>

	{#if !hasData}
		<p class="mt-4 font-body text-[13px] text-ink-dim">No missions recorded yet.</p>
	{:else}
		<div class="mt-4 grid gap-x-8 gap-y-6 md:grid-cols-2">
			{#each breakdowns as { title, rows } (title)}
				<div>
					<div
						class="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-x-3 border-b border-border pb-1.5"
					>
						<span class={label}>{title}</span>
						<span class="{label} text-right">Games</span>
						<span class="{label} w-11 text-right">Win</span>
						<span class="{label} w-9 text-right">Avg</span>
					</div>
					{#if rows.length === 0}
						<p class="mt-2.5 font-body text-[12px] text-ink-dim">None recorded.</p>
					{:else}
						<ul>
							{#each rows as row (row.mission)}
								<li
									class="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-x-3 border-t border-border/60 py-2 first:border-t-0"
								>
									<span class="truncate font-body text-[13px] text-ink" title={row.mission}>
										{row.mission}
									</span>
									<span class="text-right font-body text-[12px] text-ink-faint tabular-nums">
										{row.played}
									</span>
									<span
										class="w-11 text-right font-body text-[13px] font-semibold text-accent tabular-nums"
									>
										{percent(row.winRate)}
									</span>
									<span class="w-9 text-right font-body text-[13px] text-ink-dim tabular-nums">
										{score(row.avgScore)}
									</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</section>
