<script lang="ts">
	import WarbandStats from '$lib/components/WarbandStats.svelte';
	import MissionAnalytics from '$lib/components/MissionAnalytics.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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

	{#if data.statWarbands.length > 0}
		<WarbandStats
			warbands={data.statWarbands}
			reports={data.statReports}
			viewerUserId={data.viewerUserId}
			galleryImages={data.galleryImages}
			slug={data.slug}
		/>
	{/if}

	<MissionAnalytics analytics={data.missionAnalytics} />
</main>
