<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import BrandMark from '$lib/components/BrandMark.svelte';
	import Planet from '$lib/components/Planet.svelte';
	import {
		ARCHETYPES,
		archetypeFor,
		generateSystem,
		generateOne,
		MIN_WORLDS,
		MAX_WORLDS,
		type RenderKey
	} from '$lib/domain/archetypes';
	import { SCORING_GROUPS } from '$lib/domain/scoring-profile';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// One nested form for the whole rite. dataType:'json' lets the worlds array, the scoring
	// profile object, and the effect pool post as structured data rather than flat fields.
	const { form, errors, enhance, submitting } = untrack(() =>
		// scrollToError jumps to the first invalid field on a failed submit instead of leaving the
		// arbiter hunting through the long founding form.
		superForm(data.form, { dataType: 'json', scrollToError: 'smooth' })
	);

	// ── identity ──────────────────────────────────────────────────────────────
	// Client mirror of the server's slugify, so the arbiter sees the link as they name it.
	const slugify = (name: string) =>
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'campaign';
	const slug = $derived(slugify($form.name));

	// ── system generator ────────────────────────────────────────────────────────
	// Bumped to force the live planet previews to remount when a re-roll keeps the same render.
	let systemNonce = $state(0);
	const seed = () => (Math.random() * 0x100000000) >>> 0;

	// Rolling a world mounts new WebGL planet canvases, which blocks for a beat. Flip a flag so the
	// previews show a loading placeholder and the controls disable while it happens.
	let generating = $state(false);

	const archetypeItems = ARCHETYPES.map((a) => ({ value: a.render, label: a.tag }));

	async function regenerate(mutate: () => void) {
		if (generating) return;
		generating = true;
		// Two frames so the placeholder actually paints before the (blocking) planet remount.
		await new Promise(requestAnimationFrame);
		await new Promise(requestAnimationFrame);
		mutate();
		systemNonce++;
		await tick();
		generating = false;
	}

	function shuffleSystem() {
		regenerate(() => {
			$form.worlds = generateSystem($form.worlds.length, seed());
		});
	}
	function addWorld() {
		if (generating || $form.worlds.length >= MAX_WORLDS) return;
		regenerate(() => {
			$form.worlds = [
				...$form.worlds,
				generateOne(
					seed(),
					$form.worlds.map((w) => w.name)
				)
			];
		});
	}
	function removeWorld(i: number) {
		if ($form.worlds.length <= MIN_WORLDS) return;
		$form.worlds = $form.worlds.filter((_, j) => j !== i);
	}
	// Switching archetype re-rolls the type label + blurb to match the new look (both stay editable).
	function setArchetype(i: number, render: RenderKey) {
		const a = archetypeFor(render);
		const next = [...$form.worlds];
		const w = next[i];
		next[i] = {
			...w,
			render,
			type: a.typeLabels[Math.floor(Math.random() * a.typeLabels.length)],
			description: a.blurbs[Math.floor(Math.random() * a.blurbs.length)].replaceAll(
				'{name}',
				w.name
			)
		};
		$form.worlds = next;
	}

	// ── effects pool ────────────────────────────────────────────────────────────
	function addEffect() {
		$form.effects = [...$form.effects, { title: '', description: '' }];
	}
	function removeEffect(i: number) {
		$form.effects = $form.effects.filter((_, j) => j !== i);
	}

	// ── sequence rail / scroll-spy ───────────────────────────────────────────────
	const steps = [
		{ id: 'identity', n: '01', label: 'Identity' },
		{ id: 'system', n: '02', label: 'System' },
		{ id: 'scoring', n: '03', label: 'Scoring' },
		{ id: 'effects', n: '04', label: 'Effects' }
	];
	let active = $state('identity');

	$effect(() => {
		const obs = new IntersectionObserver(
			(entries) => {
				for (const e of entries) if (e.isIntersecting) active = e.target.id;
			},
			// Trip when a section crosses the upper-middle band, so the rail tracks the read position.
			{ rootMargin: '-40% 0px -55% 0px' }
		);
		for (const s of steps) {
			const el = document.getElementById(s.id);
			if (el) obs.observe(el);
		}
		return () => obs.disconnect();
	});

	function jumpTo(id: string) {
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	// Live readouts for the rail.
	const activeScored = $derived(
		SCORING_GROUPS.flatMap((g) => g.categories).filter((c) => $form.scoringProfile[c.key] > 0)
			.length
	);
	const status = $derived<Record<string, string>>({
		identity: $form.name.trim() ? slug : 'unnamed',
		system: `${$form.worlds.length} ${$form.worlds.length === 1 ? 'world' : 'worlds'}`,
		scoring: `${activeScored} active`,
		effects: $form.effects.length ? `${$form.effects.length} in pool` : 'none'
	});

	// ── shared styling (the cogitator console language) ──────────────────────────
	const panel =
		"relative bg-panel border border-border px-[22px] pt-5 pb-[22px] before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-[linear-gradient(90deg,var(--color-accent),transparent_70%)] before:opacity-70 before:content-['']";
	const sec =
		"flex items-center gap-2.5 font-display font-semibold text-[10px] tracking-[0.14em] uppercase text-ink-dim mb-1 after:content-[''] after:flex-1 after:h-px after:bg-border";
	const label = 'font-display font-semibold text-[10px] tracking-[0.1em] uppercase text-ink-dim';
	const control =
		'w-full bg-void border border-border px-[11px] py-2.5 font-body text-[13px] text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-[120ms] focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent-mid),0_0_14px_var(--color-accent-soft)] aria-invalid:border-state-attacker-line aria-invalid:shadow-[0_0_0_1px_var(--color-state-attacker-line)]';
	const num =
		'w-[58px] bg-void border border-border px-2 py-2 font-body text-[14px] text-center tabular-nums text-ink transition-[border-color,box-shadow] duration-[120ms] focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent-mid)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none';
	const fieldError = 'font-body text-[12px] text-state-attacker';
</script>

<div class="relative min-h-[100dvh] overflow-hidden bg-void">
	<!-- Atmosphere: the same faint phosphor bloom the hub uses, so founding feels of-a-piece. -->
	<div aria-hidden="true" class="pointer-events-none fixed inset-0">
		<div
			class="absolute top-0 left-1/2 h-[440px] w-[860px] max-w-[150vw] -translate-x-1/2 -translate-y-[40%] rounded-full bg-[radial-gradient(ellipse_at_center,var(--color-accent-soft),transparent_70%)] opacity-60 blur-[42px]"
		></div>
		<div class="absolute inset-0 shadow-[inset_0_0_240px_70px_rgba(0,0,0,0.85)]"></div>
	</div>

	<header
		class="relative z-10 flex items-center gap-4 border-b border-border bg-[linear-gradient(180deg,var(--color-panel)_0%,transparent_140%)] px-[22px] py-3.5 backdrop-blur-[6px] after:absolute
			after:-bottom-px after:left-0 after:h-px after:w-full after:bg-[linear-gradient(90deg,transparent,var(--color-border-lum)_30%,var(--color-border-lum)_70%,transparent)] after:opacity-60 after:content-[''] max-[680px]:px-4"
	>
		<a href="/" class="flex items-center gap-[13px] no-underline">
			<BrandMark
				class="size-9 shrink-0 text-accent drop-shadow-[0_0_6px_var(--color-accent-glow)]"
			/>
			<span
				class="font-display text-[19px] font-bold tracking-[0.03em] text-ink max-[680px]:text-[17px]"
			>
				DOMINATUS
			</span>
		</a>
		<div class="flex-1"></div>
		<Button href="/" variant="ghost">Back to roster</Button>
	</header>

	<div
		class="relative z-10 mx-auto grid max-w-[1080px] grid-cols-[210px_minmax(0,1fr)] gap-9 px-6 pt-9 pb-24 max-[920px]:grid-cols-1 max-[920px]:gap-5 max-[680px]:px-4"
	>
		<!-- ── sequence rail ─────────────────────────────────────────────────────── -->
		<aside class="max-[920px]:hidden">
			<div class="sticky top-[88px] flex flex-col gap-5">
				<div>
					<p
						class="mb-1 font-display text-[10px] font-semibold tracking-[0.16em] text-accent uppercase"
					>
						// Founding Rite
					</p>
					<h1 class="font-display text-[22px] leading-[1.05] font-bold tracking-[0.01em] text-ink">
						Forge a Campaign
					</h1>
				</div>

				<nav class="flex flex-col">
					{#each steps as s (s.id)}
						<button
							type="button"
							onclick={() => jumpTo(s.id)}
							aria-current={active === s.id ? 'step' : undefined}
							class="group flex items-center gap-3 border-t border-border py-2.5 text-left first:border-t-0 focus-visible:outline-none"
						>
							<span
								class="font-display text-[11px] font-semibold tabular-nums transition-colors duration-150 {active ===
								s.id
									? 'text-accent'
									: 'text-ink-faint group-hover:text-ink-dim'}"
							>
								{s.n}
							</span>
							<span class="flex min-w-0 flex-1 flex-col">
								<span
									class="font-display text-[12px] font-semibold tracking-[0.04em] uppercase transition-colors duration-150 {active ===
									s.id
										? 'text-ink'
										: 'text-ink-dim group-hover:text-ink'}"
								>
									{s.label}
								</span>
								<span class="truncate font-body text-[10.5px] text-ink-faint lowercase">
									{status[s.id]}
								</span>
							</span>
							{#if active === s.id}
								<span class="size-1.5 shrink-0 bg-accent shadow-[0_0_7px_var(--color-accent)]"
								></span>
							{/if}
						</button>
					{/each}
				</nav>

				<Button
					type="submit"
					form="founding"
					variant="primary"
					disabled={$submitting || !$form.name.trim()}
				>
					{$submitting ? 'Forging…' : 'Found campaign'}
				</Button>
			</div>
		</aside>

		<!-- ── the form ──────────────────────────────────────────────────────────── -->
		<form id="founding" method="POST" use:enhance class="flex min-w-0 flex-col gap-[18px]">
			<!-- 01 · Identity ───────────────────────────────────────────────────── -->
			<section id="identity" class="{panel} scroll-mt-[88px]">
				<h2 class={sec}>// 01 · Identity</h2>
				<p class="mb-4 font-body text-[12.5px] leading-[1.5] text-ink-dim">
					Name the war. You command it as its arbiter — the address is forged from the name.
				</p>

				<div class="flex flex-col gap-3.5">
					<label class="flex flex-col gap-1.5">
						<span class={label}>› Campaign name</span>
						<input
							class={control}
							name="name"
							bind:value={$form.name}
							maxlength="80"
							placeholder="e.g. The Vorhast Conflict"
							aria-invalid={$errors.name ? 'true' : undefined}
						/>
						{#if $errors.name}<span class={fieldError}>{$errors.name}</span>{/if}
					</label>

					<div
						class="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3.5 max-[520px]:grid-cols-1"
					>
						<label class="flex flex-col gap-1.5">
							<span class={label}>› Subtitle <span class="text-ink-faint">(optional)</span></span>
							<input
								class={control}
								bind:value={$form.subtitle}
								maxlength="120"
								placeholder="e.g. Vorhast System Theatre"
							/>
						</label>
						<label class="flex flex-col gap-1.5">
							<span class={label}>› Address</span>
							<output
								class="flex items-center border border-border-lum/40 bg-void px-[11px] py-2.5 font-body text-[13px] text-accent"
							>
								<span class="text-ink-faint">/campaigns/</span>{slug}
							</output>
						</label>
					</div>
				</div>
			</section>

			<!-- 02 · System ─────────────────────────────────────────────────────── -->
			<section id="system" class="{panel} scroll-mt-[88px]">
				<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
					<div class="min-w-0">
						<h2 class={sec}>// 02 · System</h2>
						<p class="mt-1 font-body text-[12.5px] leading-[1.5] text-ink-dim">
							Roll the worlds your warbands will contend for. Edit any detail, or re-roll the lot.
						</p>
					</div>
					<div class="flex shrink-0 items-center gap-2">
						<!-- World-count stepper: the "number of worlds in the system" control (1–6). -->
						<div class="flex items-center border border-border bg-void">
							<button
								type="button"
								onclick={() => removeWorld($form.worlds.length - 1)}
								disabled={generating || $form.worlds.length <= MIN_WORLDS}
								aria-label="Fewer worlds"
								class="px-2.5 py-2 font-display text-[15px] leading-none text-ink-dim transition-colors hover:text-accent disabled:opacity-30 disabled:hover:text-ink-dim"
							>
								−
							</button>
							<span
								class="w-7 text-center font-display text-[14px] font-semibold text-ink tabular-nums"
							>
								{$form.worlds.length}
							</span>
							<button
								type="button"
								onclick={addWorld}
								disabled={generating || $form.worlds.length >= MAX_WORLDS}
								aria-label="More worlds"
								class="px-2.5 py-2 font-display text-[15px] leading-none text-ink-dim transition-colors hover:text-accent disabled:opacity-30 disabled:hover:text-ink-dim"
							>
								+
							</button>
						</div>
						<Button type="button" onclick={shuffleSystem} disabled={generating}>
							{generating ? 'Rolling…' : '↻ Shuffle'}
						</Button>
					</div>
				</div>

				{#if typeof $errors.worlds === 'string'}
					<p class="mb-3 {fieldError}">{$errors.worlds}</p>
				{/if}

				<div class="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
					{#each $form.worlds as world, i (i)}
						<article class="flex flex-col gap-3 border border-border bg-panel-2/50 p-3.5">
							<div class="flex items-start gap-3">
								<span
									class="grid size-[72px] shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_50%_38%,var(--color-accent-soft),transparent_72%)]"
								>
									{#if generating}
										<span
											class="size-[58px] animate-pulse rounded-full border border-dashed border-border-lum/60 bg-[radial-gradient(circle_at_50%_40%,var(--color-accent-soft),transparent_68%)]"
											aria-hidden="true"
										></span>
									{:else}
										{#key `${systemNonce}:${i}:${world.render}`}
											<Planet render={world.render} size={64} resolution={90} name={world.name} />
										{/key}
									{/if}
								</span>
								<div class="flex min-w-0 flex-1 flex-col gap-1.5">
									<input
										bind:value={$form.worlds[i].name}
										maxlength="60"
										aria-label="World name"
										class="w-full border-0 border-b border-transparent bg-transparent pb-1 font-display text-[16px] font-semibold tracking-[0.01em] text-ink transition-colors placeholder:text-ink-faint hover:border-border focus:border-accent focus:outline-none"
										placeholder="World name"
									/>
									<Select
										items={archetypeItems}
										value={world.render}
										onValueChange={(v) => setArchetype(i, v as RenderKey)}
										ariaLabel="World archetype"
									/>
								</div>
								<button
									type="button"
									onclick={() => removeWorld(i)}
									disabled={$form.worlds.length <= MIN_WORLDS}
									aria-label="Remove {world.name}"
									class="shrink-0 px-1.5 py-1 font-display text-[14px] leading-none text-ink-faint transition-colors hover:text-state-attacker focus-visible:outline-none disabled:opacity-25 disabled:hover:text-ink-faint"
								>
									✕
								</button>
							</div>

							<label class="flex flex-col gap-1">
								<span class="{label} text-[9px]">› Type</span>
								<input bind:value={$form.worlds[i].type} maxlength="60" class="{control} py-2" />
							</label>

							<div class="grid grid-cols-3 gap-2">
								<label class="flex flex-col gap-1">
									<span class="{label} text-[9px]">› Value</span>
									<input bind:value={$form.worlds[i].value} maxlength="40" class="{control} py-2" />
								</label>
								<label class="flex flex-col gap-1">
									<span class="{label} text-[9px]">› Garrison</span>
									<input
										bind:value={$form.worlds[i].garrison}
										maxlength="40"
										class="{control} py-2"
									/>
								</label>
								<label class="flex flex-col gap-1">
									<span class="{label} text-[9px]">› Supply</span>
									<input
										bind:value={$form.worlds[i].supply}
										maxlength="40"
										class="{control} py-2"
									/>
								</label>
							</div>

							<label class="flex flex-col gap-1">
								<span class="{label} text-[9px]">› Lore</span>
								<textarea
									bind:value={$form.worlds[i].description}
									maxlength="400"
									rows="2"
									class="{control} resize-none leading-[1.45]"
								></textarea>
							</label>
						</article>
					{/each}
				</div>
			</section>

			<!-- 03 · Scoring ────────────────────────────────────────────────────── -->
			<section id="scoring" class="{panel} scroll-mt-[88px]">
				<h2 class={sec}>// 03 · Scoring</h2>
				<p class="mb-4 font-body text-[12.5px] leading-[1.5] text-ink-dim">
					Set what each deed is worth. A category at <b class="text-ink">0</b> is switched off — commanders
					won't see it in the standings. Tune it now or in the arbiter console later.
				</p>

				<div class="flex flex-col gap-5">
					{#each SCORING_GROUPS as group (group.title)}
						<div>
							<p
								class="mb-2.5 font-display text-[10px] font-semibold tracking-[0.12em] text-accent uppercase"
							>
								{group.title}
								<span class="ml-1 font-body text-[10.5px] tracking-normal text-ink-faint lowercase"
									>— {group.blurb}</span
								>
							</p>
							<div class="flex flex-col">
								{#each group.categories as cat (cat.key)}
									{@const off = $form.scoringProfile[cat.key] === 0}
									<div
										class="flex items-center gap-3 border-t border-border py-2.5 transition-opacity first:border-t-0 {off
											? 'opacity-45'
											: ''}"
									>
										<span class="flex min-w-0 flex-1 flex-col">
											<span class="flex items-center gap-2 font-body text-[13px] text-ink">
												{cat.label}
												{#if off}
													<span
														class="border border-border px-1 py-px font-display text-[8px] font-semibold tracking-[0.1em] text-ink-faint uppercase"
														>Off</span
													>
												{/if}
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
													bind:value={$form.scoringProfile[cat.threshold.key]}
													class="{num} w-[52px]"
												/>
												{cat.threshold.suffix}
											</span>
										{/if}

										<label class="flex items-center gap-1.5">
											<span
												class="font-display text-[9px] tracking-[0.1em] text-ink-faint uppercase"
												>pts</span
											>
											<input
												type="number"
												min="0"
												step="1"
												inputmode="numeric"
												aria-label="{cat.label} points"
												bind:value={$form.scoringProfile[cat.key]}
												class={num}
											/>
										</label>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</section>

			<!-- 04 · Effects ────────────────────────────────────────────────────── -->
			<section id="effects" class="{panel} scroll-mt-[88px]">
				<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
					<div class="min-w-0">
						<h2 class={sec}>// 04 · Planetary Effects</h2>
						<p class="mt-1 max-w-[60ch] font-body text-[12.5px] leading-[1.5] text-ink-dim">
							Define the pool of effects that can be in play — warp storms, toxic skies. Descriptive
							only; you assign them to worlds later. Optional.
						</p>
					</div>
					<Button type="button" onclick={addEffect}>+ Add effect</Button>
				</div>

				{#if $form.effects.length === 0}
					<div class="border border-dashed border-border px-5 py-7 text-center">
						<p class="font-body text-[12.5px] text-ink-dim">No effects in the pool.</p>
						<p class="mt-1 font-body text-[11.5px] text-ink-faint">
							A campaign can run without any — add them whenever the lore calls for it.
						</p>
					</div>
				{:else}
					<div class="flex flex-col gap-2.5">
						{#each $form.effects as effect, i (i)}
							<div class="flex items-start gap-2.5 border border-border bg-panel-2/50 p-2.5">
								<span
									class="mt-2.5 font-display text-[10px] font-semibold text-ink-faint tabular-nums"
									aria-hidden="true">{String(i + 1).padStart(2, '0')}</span
								>
								<div class="flex min-w-0 flex-1 flex-col gap-2">
									<input
										bind:value={$form.effects[i].title}
										maxlength="60"
										placeholder="Effect name — e.g. Warp Storm"
										aria-label="Effect title"
										class="{control} py-2 font-display text-[13px] font-semibold tracking-[0.01em]"
									/>
									<textarea
										bind:value={$form.effects[i].description}
										maxlength="400"
										rows="2"
										placeholder="What it does, in your own words. The app shows it; it never enforces it."
										aria-label="Effect description"
										class="{control} resize-none py-2 leading-[1.45]"
									></textarea>
								</div>
								<button
									type="button"
									onclick={() => removeEffect(i)}
									aria-label="Remove effect"
									class="mt-1 shrink-0 px-1.5 py-1 font-display text-[14px] leading-none text-ink-faint transition-colors hover:text-state-attacker focus-visible:outline-none"
								>
									✕
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<!-- Mobile / end-of-form submit (the rail's button is hidden on narrow screens). -->
			<div class="flex items-center justify-end gap-3 pt-1">
				<Button type="submit" variant="primary" disabled={$submitting || !$form.name.trim()}>
					{$submitting ? 'Forging…' : 'Found campaign'}
				</Button>
			</div>
		</form>
	</div>
</div>
