<script lang="ts">
	// The campaign charter. The scoring values are read from the campaign's own Scoring Profile
	// (ADR 0004) via the shared category metadata, so the page can never drift from how points are
	// actually awarded — and a category the arbiter has switched off (0) simply doesn't appear.
	// Control mechanics (±10% pool, ADR 0002) and the scoring ledger are the two halves, separate.
	import { SCORING_GROUPS, DEFAULT_PROFILE, type CategoryMeta } from '$lib/domain/scoring-profile';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	const profile = $derived(data.campaign.scoringProfile ?? DEFAULT_PROFILE);

	// A category's threshold, rendered with the live profile value (e.g. "every 20% control").
	const threshold = (c: CategoryMeta): string | null => {
		if (!c.threshold) return null;
		const v = profile[c.threshold.key];
		const sep = c.threshold.suffix.startsWith('%') ? '' : ' ';
		return `${c.threshold.prefix} ${v}${sep}${c.threshold.suffix}`;
	};

	// Only the categories the arbiter has switched on (value > 0); empty groups drop out entirely.
	const groups = $derived(
		SCORING_GROUPS.map((g) => ({
			title: g.title,
			blurb: g.blurb,
			rows: g.categories
				.filter((c) => profile[c.key] > 0)
				.map((c) => ({
					value: `+${profile[c.key]}`,
					label: c.label,
					note: c.hint,
					sub: threshold(c)
				}))
		})).filter((g) => g.rows.length > 0)
	);

	// Army-size ladder: a table-talk rule the app does NOT enforce — reports submit at any size.
	// The cap is set by the HIGHEST control share among the combatants (yours or your opponent's)
	// on the world being fought over, so a big holder lets both sides field a larger army.
	const ladder = [
		{ band: 'Default', size: '500 pts' },
		{ band: 'At least 20%', size: '1000 pts' },
		{ band: 'At least 30%', size: '1500 pts' },
		{ band: 'At least 40%', size: '2000 pts' }
	];
</script>

<main class="mx-auto w-full max-w-2xl px-6 py-8 max-[720px]:px-4">
	<header class="mb-7">
		<p class="font-display text-[10px] font-semibold tracking-[0.18em] text-ink-faint uppercase">
			{data.campaign.name} · Charter
		</p>
		<h1 class="mt-1.5 font-display text-2xl font-bold tracking-[0.02em] text-accent">
			Campaign rules
		</h1>
		<p class="mt-2.5 max-w-prose font-prose text-[15px] leading-[1.6] text-ink-dim">
			Warbands contend for control of the system's worlds, one battle at a time. Control is the map;
			standings are the points — two separate tallies, both derived from the reports you log. This
			is the Malvernis Sector charter.
		</p>
	</header>

	<!-- ── World control ─────────────────────────────────────────────────────── -->
	<section class="mb-9">
		<h2
			class="flex items-baseline gap-2 border-b border-border pb-2 font-display text-[11px] font-semibold tracking-[0.14em] text-ink-dim uppercase"
		>
			<span class="text-accent">▸</span> World control
		</h2>

		<p class="mt-3.5 font-prose text-[15px] leading-[1.6] text-ink">
			Every world is a fixed <b class="text-accent">100% pool</b>. Each warband holds a share in
			steps of 10%; whatever no one holds is the world's <b class="text-ink">uncontested</b>
			remainder. Worlds start fully uncontested. A decisive battle moves control by
			<b class="text-accent">10 points</b>:
		</p>

		<ul class="mt-3 flex flex-col gap-2 font-body text-[13px] leading-[1.55] text-ink-dim">
			<li class="flex gap-2.5">
				<span class="mt-[7px] size-1 shrink-0 bg-state-attacker" aria-hidden="true"></span>
				<span
					>The <b class="text-ink">loser</b> drops 10%, floored at zero — a warband never goes negative.</span
				>
			</li>
			<li class="flex gap-2.5">
				<span class="mt-[7px] size-1 shrink-0 bg-accent" aria-hidden="true"></span>
				<span
					>The <b class="text-ink">winner</b> rises 10%, taken from the loser first, then from the uncontested
					pool — that is how a world is first claimed. The gain is capped so the world never exceeds 100%.</span
				>
			</li>
			<li class="flex gap-2.5">
				<span class="mt-[7px] size-1 shrink-0 bg-state-defender" aria-hidden="true"></span>
				<span
					>In a <b class="text-ink">2v2</b> the rule applies per warband: each winner +10%, each loser
					−10%, so a winning side pulls up to 20% off the world.</span
				>
			</li>
			<li class="flex gap-2.5">
				<span class="mt-[7px] size-1 shrink-0 bg-state-contested" aria-hidden="true"></span>
				<span>A <b class="text-ink">draw</b> moves no control at all.</span>
			</li>
		</ul>

		<p class="mt-3.5 font-prose text-[14px] leading-[1.6] text-ink-dim">
			Because shares clamp at 0 and the pool caps at 100, the <i>order</i> of battles matters. Control
			is replayed in sequence over a world's approved reports, so reversing or rejecting a report just
			re-runs the replay — no hand corrections.
		</p>

		<!-- Reading a world: the three derived states. -->
		<div class="mt-5 grid grid-cols-3 gap-2.5 max-[560px]:grid-cols-1">
			<div class="border border-state-defender-line bg-state-defender-soft px-3.5 py-3">
				<p
					class="font-display text-[11px] font-semibold tracking-[0.08em] text-state-defender uppercase"
				>
					Owned
				</p>
				<p class="mt-1.5 font-body text-[12px] leading-[1.5] text-ink-dim">
					One warband holds a majority — over 50%.
				</p>
			</div>
			<div class="border border-state-contested-line bg-state-contested-soft px-3.5 py-3">
				<p
					class="font-display text-[11px] font-semibold tracking-[0.08em] text-state-contested uppercase"
				>
					Contested
				</p>
				<p class="mt-1.5 font-body text-[12px] leading-[1.5] text-ink-dim">
					Shares exist, but no warband holds a majority.
				</p>
			</div>
			<div class="border border-border bg-panel-2/60 px-3.5 py-3">
				<p
					class="font-display text-[11px] font-semibold tracking-[0.08em] text-ink-faint uppercase"
				>
					Unclaimed
				</p>
				<p class="mt-1.5 font-body text-[12px] leading-[1.5] text-ink-dim">
					No warband holds any share of the world.
				</p>
			</div>
		</div>

		<!-- Army-size ladder: an advisory table-talk rule, not enforced by report submission. -->
		<p class="mt-5 font-prose text-[15px] leading-[1.6] text-ink">
			How big an army you may bring is set by control of the world you fight over. The cap follows
			the
			<b class="text-accent">larger holding among the combatants</b> — if you <i>or</i> your opponent
			holds the share, both sides may field the bigger army.
		</p>
		<div
			class="mt-3 border border-border bg-[color-mix(in_srgb,var(--color-panel)_70%,transparent)]"
		>
			<p
				class="border-b border-border px-3.5 py-2.5 font-display text-[9.5px] font-medium tracking-[0.12em] text-ink-faint uppercase"
			>
				Army size by control held
			</p>
			<table class="w-full border-collapse font-body text-[13px]">
				<tbody>
					{#each ladder as row (row.band)}
						<tr class="border-t border-border first:border-t-0">
							<td class="px-3.5 py-2.5 text-ink-dim">{row.band}</td>
							<td class="px-3.5 py-2.5 text-right font-semibold text-accent tabular-nums"
								>{row.size}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="mt-2.5 font-body text-[12px] leading-[1.5] text-ink-faint">
			A table-talk rule, agreed before the game — the cogitator does not check it, and reports
			submit at any size.
		</p>
	</section>

	<!-- ── Standings ─────────────────────────────────────────────────────────── -->
	<section class="mb-9">
		<h2
			class="flex items-baseline gap-2 border-b border-border pb-2 font-display text-[11px] font-semibold tracking-[0.14em] text-ink-dim uppercase"
		>
			<span class="text-accent">▸</span> Standings
		</h2>

		<p class="mt-3.5 font-prose text-[15px] leading-[1.6] text-ink">
			The leaderboard is a points table, <b class="text-accent">separate from control</b>. Most
			points fall straight out of the reports you log; painting is granted by the arbiter. Points
			accrue per warband — a commander running two warbands scores them apart. The arbiter sets each
			category's value; anything switched off doesn't appear here.
		</p>

		{#each groups as group (group.title)}
			<div class="mt-5">
				<p class="font-display text-[10px] font-semibold tracking-[0.12em] text-accent uppercase">
					{group.title}
					<span class="ml-1 font-body text-[11px] tracking-normal text-ink-faint normal-case"
						>— {group.blurb}</span
					>
				</p>
				<dl class="mt-1.5 flex flex-col">
					{#each group.rows as row (row.label)}
						<div
							class="grid grid-cols-[64px_1fr] items-baseline gap-3 border-t border-border py-3 first:border-t-0 max-[480px]:grid-cols-1 max-[480px]:gap-1"
						>
							<dt class="font-body text-[15px] font-semibold text-accent tabular-nums">
								{row.value}
							</dt>
							<dd>
								<span
									class="font-display text-[12px] font-semibold tracking-[0.06em] text-ink uppercase"
									>{row.label}</span
								>
								{#if row.sub}<span class="ml-2 font-body text-[11px] text-ink-faint">{row.sub}</span
									>{/if}
								<p class="mt-0.5 font-body text-[12.5px] leading-[1.5] text-ink-dim">{row.note}</p>
							</dd>
						</div>
					{/each}
				</dl>
			</div>
		{/each}
	</section>

	<!-- ── Cycles ────────────────────────────────────────────────────────────── -->
	<section>
		<h2
			class="flex items-baseline gap-2 border-b border-border pb-2 font-display text-[11px] font-semibold tracking-[0.14em] text-ink-dim uppercase"
		>
			<span class="text-accent">▸</span> Cycles
		</h2>
		<p class="mt-3.5 font-prose text-[15px] leading-[1.6] text-ink-dim">
			The campaign runs in numbered cycles, and every report is stamped with the cycle it was fought
			in. This campaign is on <b class="text-accent">cycle {data.campaign.currentCycle}</b>. How
			long a cycle lasts, and what happens when one closes, are the arbiter's call.
		</p>
	</section>
</main>
