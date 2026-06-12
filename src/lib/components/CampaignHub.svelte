<script lang="ts">
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import { signOut } from '$lib/auth-client';
	import Button from '$lib/components/ui/Button.svelte';
	import BrandMark from '$lib/components/BrandMark.svelte';
	import type { JoinCampaignInput } from '$lib/schemas/campaign-create';

	type CampaignRow = {
		id: string;
		slug: string;
		name: string;
		subtitle: string | null;
		currentCycle: number;
		status: 'active' | 'archived';
		role: 'arbiter' | 'commander';
	};

	let {
		user,
		campaigns,
		joinForm
	}: {
		user: { name?: string | null };
		campaigns: CampaignRow[];
		joinForm: SuperValidated<JoinCampaignInput>;
	} = $props();

	const {
		form: join,
		errors: joinErrors,
		enhance: joinEnhance,
		submitting: joinSubmitting
	} = untrack(() => superForm(joinForm, { resetForm: false }));

	async function logout() {
		await signOut();
		await goto('/', { invalidateAll: true });
	}

	const panel =
		"relative bg-panel border border-border px-[22px] pt-5 pb-[22px] before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-[linear-gradient(90deg,var(--color-accent),transparent_70%)] before:opacity-70 before:content-['']";
	const sec =
		"flex items-center gap-2.5 font-display font-semibold text-[10px] tracking-[0.14em] uppercase text-ink-dim mb-3 after:content-[''] after:flex-1 after:h-px after:bg-border";
	const label = 'font-display font-semibold text-[10px] tracking-[0.1em] uppercase text-ink-dim';
	const control =
		'w-full bg-void border border-border px-[11px] py-2.5 font-body text-[13px] text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent-mid),0_0_14px_var(--color-accent-soft)]';
	const fieldError = 'font-body text-[12px] text-state-attacker';
</script>

<header
	class="relative z-10 flex items-center gap-4 border-b border-border bg-[linear-gradient(180deg,var(--color-panel)_0%,transparent_140%)] px-[22px] py-3.5 backdrop-blur-[6px] after:absolute
		after:-bottom-px after:left-0 after:h-px after:w-full after:bg-[linear-gradient(90deg,transparent,var(--color-border-lum)_30%,var(--color-border-lum)_70%,transparent)] after:opacity-60 after:content-[''] max-[680px]:px-4"
>
	<span class="flex items-center gap-[13px]">
		<BrandMark class="size-9 shrink-0 text-accent drop-shadow-[0_0_6px_var(--color-accent-glow)]" />
		<span
			class="font-display text-[19px] font-bold tracking-[0.03em] text-ink max-[680px]:text-[17px]"
		>
			DOMINATUS
		</span>
	</span>

	<div class="flex-1"></div>

	{#if user.name}
		<span class="font-body text-[12px] text-ink-dim max-[520px]:hidden">{user.name}</span>
	{/if}
	<Button href="/account" variant="ghost">Account</Button>
	<Button type="button" variant="ghost" onclick={logout}>Sign out</Button>
</header>

<main class="mx-auto max-w-[940px] px-6 pt-9 pb-20 max-[680px]:px-4">
	<header class="mb-7">
		<p
			class="mb-2.5 font-display text-[10px] font-semibold tracking-[0.14em] text-accent uppercase"
		>
			// Command Roster
		</p>
		<h1 class="font-display text-[30px] leading-none font-bold tracking-[0.01em] text-ink">
			Your Campaigns
		</h1>
		<p class="mt-3 max-w-[64ch] font-body text-[13px] leading-[1.55] text-ink-dim">
			Every war you command or contend in. Open one to survey its system, found a new theatre to run
			as its arbiter, or join an existing one with a code.
		</p>
	</header>

	{#if campaigns.length > 0}
		<ul class="mb-10 flex flex-col gap-2">
			{#each campaigns as c (c.id)}
				<li>
					<a
						href="/campaigns/{c.slug}"
						class="group relative flex items-center gap-4 border border-border bg-panel px-[18px] py-[15px] no-underline transition-[border-color,background-color] duration-150 hover:border-border-lum hover:bg-accent-soft focus-visible:border-accent focus-visible:bg-accent-soft focus-visible:outline-none {c.status ===
						'archived'
							? 'opacity-65'
							: ''}"
					>
						{#if c.status === 'active'}
							<span
								class="size-2 shrink-0 bg-accent shadow-[0_0_7px_var(--color-accent)]"
								aria-hidden="true"
							></span>
						{:else}
							<span class="size-2 shrink-0 border border-ink-faint" aria-hidden="true"></span>
						{/if}

						<span class="flex min-w-0 flex-1 flex-col gap-1">
							<span
								class="truncate font-display text-[16px] font-semibold tracking-[0.01em] text-ink transition-colors duration-150 group-hover:text-accent group-focus-visible:text-accent"
							>
								{c.name}
							</span>
							<span
								class="truncate font-display text-[10px] tracking-[0.12em] text-ink-dim uppercase"
							>
								{c.subtitle || 'Campaign Cogitator'}
								<span class="text-ink-faint">·</span>
								<span class="font-body tracking-normal text-ink-faint lowercase">{c.slug}</span>
							</span>
						</span>

						<span
							class="shrink-0 border px-2 py-0.5 font-display text-[9.5px] font-semibold tracking-[0.14em] uppercase {c.role ===
							'arbiter'
								? 'border-border-lum text-accent'
								: 'border-border text-ink-dim'}"
						>
							{c.role}
						</span>

						{#if c.status === 'archived'}
							<span
								class="shrink-0 font-display text-[10px] tracking-[0.12em] text-ink-faint uppercase max-[520px]:hidden"
							>
								Archived
							</span>
						{:else}
							<span
								class="shrink-0 font-display text-[10px] tracking-[0.12em] text-ink-dim uppercase tabular-nums max-[520px]:hidden"
							>
								Cycle {c.currentCycle}
							</span>
						{/if}

						<span
							class="shrink-0 font-display text-[18px] leading-none text-ink-faint transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:text-accent group-focus-visible:text-accent motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
							aria-hidden="true">›</span
						>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="relative mb-10 overflow-hidden border border-border bg-panel px-7 py-9">
			<BrandMark
				class="pointer-events-none absolute -right-6 -bottom-8 size-44 text-accent opacity-[0.05]"
			/>
			<p class="font-display text-[15px] font-semibold tracking-[0.01em] text-ink">
				No campaigns on your roster yet.
			</p>
			<p class="mt-2 max-w-[60ch] font-body text-[13px] leading-[1.55] text-ink-dim">
				Found a new theatre to command it as its arbiter, or join an existing war with the code an
				arbiter shared with you. Both are below.
			</p>
		</div>
	{/if}

	<div class="grid grid-cols-2 gap-[18px] max-[720px]:grid-cols-1">
		<!-- ── Found a campaign ──────────────────────────────────── -->
		<section class="{panel} flex flex-col">
			<h2 class={sec}>// Found a Campaign</h2>
			<p class="mb-4 font-body text-[13px] leading-[1.5] text-ink-dim">
				Forge a new theatre and command it as its arbiter: name the war, roll its planetary system,
				set the scoring, and declare the effects in play.
			</p>

			<ul class="mb-5 flex flex-col gap-1.5 font-body text-[12.5px] text-ink-dim">
				{#each ['Generate a system of up to six worlds', 'Tune what every deed scores', 'Stake out the planetary effects in play'] as item (item)}
					<li class="flex items-center gap-2.5">
						<span class="size-1 shrink-0 bg-accent" aria-hidden="true"></span>
						{item}
					</li>
				{/each}
			</ul>

			<div class="mt-auto flex justify-end">
				<Button href="/campaigns/new" variant="primary">Begin founding →</Button>
			</div>
		</section>

		<!-- ── Join a campaign ───────────────────────────────────── -->
		<section class={panel}>
			<h2 class={sec}>// Join a Campaign</h2>
			<p class="mb-4 font-body text-[13px] leading-[1.5] text-ink-dim">
				Enlist as a commander. Enter the 5-character code your arbiter shared with you.
			</p>

			<form method="POST" action="?/join" class="flex flex-col gap-3.5" use:joinEnhance>
				<label class="flex flex-col gap-1.5">
					<span class={label}>› Campaign code</span>
					<input
						class="{control} font-display tracking-[0.3em] uppercase"
						name="code"
						bind:value={$join.code}
						maxlength="5"
						placeholder="e.g. VRH42"
						autocapitalize="characters"
						autocomplete="off"
						spellcheck="false"
						aria-invalid={$joinErrors.code ? 'true' : undefined}
					/>
					{#if $joinErrors.code}<span class={fieldError}>{$joinErrors.code}</span>{/if}
				</label>

				<div class="flex justify-end pt-1">
					<Button type="submit" variant="primary" disabled={$joinSubmitting}>
						{$joinSubmitting ? 'Joining…' : 'Join campaign'}
					</Button>
				</div>
			</form>
		</section>
	</div>
</main>
