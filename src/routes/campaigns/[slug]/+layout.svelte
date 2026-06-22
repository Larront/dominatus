<script lang="ts">
	import { page } from '$app/state';
	import { fadeRise } from '$lib/motion';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const slug = $derived(page.params.slug);
	const base = $derived(`/campaigns/${slug}`);

	// Mobile section nav collapses into a dropdown — the inline links overflow a phone width
	// (the desktop row is preserved above 720px). Closed on navigation, Escape, or a backdrop tap.
	let menuOpen = $state(false);

	const nav = $derived([
		{ href: base, label: 'Map' },
		{ href: `${base}/report`, label: 'Report' },
		{ href: `${base}/standings`, label: 'Standings' },
		{ href: `${base}/chronicle`, label: 'Chronicle' },
		{ href: `${base}/gallery`, label: 'Gallery' },
		{ href: `${base}/rules`, label: 'Rules' },
		// The admin console is the arbiter's alone (its route also guards server-side).
		...(data.role === 'arbiter' ? [{ href: `${base}/admin`, label: 'Admin' }] : []),
		{ href: `${base}/account`, label: 'Account' },
		// App-wide feedback; carries the current path so the form can return the commander here.
		{ href: `/feedback?from=${encodeURIComponent(page.url.pathname)}`, label: 'Feedback' }
	]);
	const isActive = (href: string) =>
		href === base ? page.url.pathname === base : page.url.pathname.startsWith(href);

	const navLink =
		'border border-transparent px-[13px] py-[9px] font-display text-[11px] font-semibold tracking-[0.09em] uppercase no-underline transition-[color,border-color,background-color] duration-[120ms] max-[720px]:px-[9px] max-[720px]:py-2 max-[720px]:text-[10px]';
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (menuOpen = false)} />

<div class="flex h-[100dvh] flex-col overflow-hidden bg-void">
	<header
		class="relative z-10 flex flex-shrink-0 items-center gap-4 border-b border-border bg-[linear-gradient(180deg,var(--color-panel)_0%,transparent_140%)] px-[22px] py-3 backdrop-blur-[6px] after:absolute after:-bottom-px
			after:left-0 after:h-px after:w-full after:bg-[linear-gradient(90deg,transparent,var(--color-border-lum)_30%,var(--color-border-lum)_70%,transparent)] after:opacity-60 after:content-[''] max-[720px]:gap-2.5 max-[720px]:px-3.5"
	>
		<a
			href="/"
			aria-label="Back to all your campaigns"
			class="flex size-9 shrink-0 items-center justify-center border border-border bg-panel-2 text-ink-dim transition-[color,border-color] duration-[120ms] hover:border-border-lum hover:text-accent focus-visible:border-accent focus-visible:text-accent focus-visible:outline-none"
		>
			<svg viewBox="0 0 20 20" class="size-[18px]" aria-hidden="true">
				<path
					d="M12 4l-6 6 6 6"
					fill="none"
					stroke="currentColor"
					stroke-width="1.7"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</a>

		<a
			class="flex items-center gap-[13px] no-underline"
			href={base}
			aria-label="{data.campaign.name} — system map"
		>
			<span
				class="size-9 shrink-0 text-accent drop-shadow-[0_0_6px_var(--color-accent-glow)]"
				aria-hidden="true"
			>
				<svg viewBox="0 0 32 32" class="size-full">
					<circle
						cx="16"
						cy="16"
						r="13"
						fill="none"
						stroke="currentColor"
						stroke-width="1"
						stroke-dasharray="2 3"
						opacity="0.7"
					/>
					<ellipse
						cx="16"
						cy="16"
						rx="13"
						ry="5.5"
						fill="none"
						stroke="currentColor"
						stroke-width="1.2"
					/>
					<circle cx="16" cy="16" r="3" fill="currentColor" />
					<circle cx="29" cy="16" r="1.7" fill="currentColor" />
				</svg>
			</span>
			<span class="flex flex-col gap-1 leading-none">
				<span
					class="font-display text-[19px] font-bold tracking-[0.02em] whitespace-nowrap text-ink max-[720px]:text-[17px]"
				>
					{data.campaign.name}
				</span>
				<span
					class="font-display text-[9.5px] font-medium tracking-[0.18em] whitespace-nowrap text-ink-dim uppercase max-[720px]:hidden"
				>
					{data.campaign.subtitle ?? 'Campaign Cogitator'} · {data.role}
				</span>
			</span>
		</a>

		<div class="flex-1"></div>

		<!-- Desktop: the section links inline. Collapses to the dropdown below 1024px —
		     the full section list overflows the header at tablet/half-screen widths. -->
		<nav class="flex gap-0.5 max-[1024px]:hidden" aria-label="Campaign sections">
			{#each nav as item (item.href)}
				<a
					class="{navLink} {isActive(item.href)
						? 'border-border bg-accent-soft text-accent'
						: 'text-ink-dim hover:text-accent'}"
					href={item.href}
					aria-current={isActive(item.href) ? 'page' : undefined}
				>
					{item.label}
				</a>
			{/each}
		</nav>

		<!-- Narrow widths: collapse the same links into a dropdown. -->
		<div class="relative hidden max-[1024px]:block">
			<button
				type="button"
				onclick={() => (menuOpen = !menuOpen)}
				aria-label="Campaign sections"
				aria-expanded={menuOpen}
				class="flex size-9 items-center justify-center border border-border bg-panel-2 text-ink-dim transition-[color,border-color] duration-[120ms] hover:border-border-lum hover:text-accent focus-visible:border-accent focus-visible:text-accent focus-visible:outline-none"
			>
				<svg viewBox="0 0 20 20" class="size-[18px]" aria-hidden="true">
					{#if menuOpen}
						<path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.6" fill="none" />
					{:else}
						<path
							d="M3 6h14M3 10h14M3 14h14"
							stroke="currentColor"
							stroke-width="1.6"
							fill="none"
						/>
					{/if}
				</svg>
			</button>

			{#if menuOpen}
				<!-- Tap-outside backdrop; the menu sits above it. -->
				<button
					type="button"
					tabindex="-1"
					aria-hidden="true"
					class="fixed inset-0 z-10 cursor-default"
					onclick={() => (menuOpen = false)}
					transition:fadeRise={{ y: 0 }}
				></button>
				<nav
					class="absolute top-[calc(100%+12px)] right-0 z-20 flex min-w-[180px] flex-col border border-border bg-panel shadow-[0_12px_30px_-8px_rgba(0,0,0,0.7)]"
					aria-label="Campaign sections"
					transition:fadeRise={{ y: -6 }}
				>
					{#each nav as item (item.href)}
						<a
							class="border-b border-border px-4 py-3 font-display text-[11px] font-semibold tracking-[0.09em] uppercase no-underline transition-[color,background-color] duration-[120ms] last:border-b-0 {isActive(
								item.href
							)
								? 'bg-accent-soft text-accent'
								: 'text-ink-dim hover:text-accent'}"
							href={item.href}
							aria-current={isActive(item.href) ? 'page' : undefined}
							onclick={() => (menuOpen = false)}
						>
							{item.label}
						</a>
					{/each}
				</nav>
			{/if}
		</div>
	</header>

	<main class="relative min-h-0 flex-1 overflow-y-auto">
		{@render children()}
	</main>
</div>
