<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const slug = $derived(page.params.slug);
	const base = $derived(`/campaigns/${slug}`);

	const nav = $derived([
		{ href: base, label: 'Map' },
		{ href: `${base}/report`, label: 'Report' },
		{ href: `${base}/rules`, label: 'Rules' },
		{ href: `${base}/account`, label: 'Account' }
	]);
	const isActive = (href: string) =>
		href === base ? page.url.pathname === base : page.url.pathname.startsWith(href);
</script>

<div class="shell">
	<header class="topbar">
		<a class="brand" href={base} aria-label="{data.campaign.name} — system map">
			<span class="brand-mark" aria-hidden="true">
				<svg viewBox="0 0 32 32">
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
			<span class="brand-text">
				<span class="brand-sys">{data.campaign.name}</span>
				<span class="brand-sub">
					{data.campaign.subtitle ?? 'Campaign Cogitator'} · {data.role}
				</span>
			</span>
		</a>

		<div class="topbar-spacer"></div>

		<span class="cycle-pill" aria-label="Current cycle {data.campaign.currentCycle}">
			<span class="cycle-dot" aria-hidden="true"></span>
			Cycle <b>{data.campaign.currentCycle}</b>
		</span>

		<nav class="topnav" aria-label="Campaign sections">
			{#each nav as item (item.href)}
				<a
					class="nav-link"
					class:active={isActive(item.href)}
					href={item.href}
					aria-current={isActive(item.href) ? 'page' : undefined}
				>
					{item.label}
				</a>
			{/each}
		</nav>
	</header>

	<main class="content">
		{@render children()}
	</main>
</div>

<style>
	.shell {
		display: flex;
		flex-direction: column;
		height: 100dvh;
		overflow: hidden;
		background: var(--bg-0);
	}

	.topbar {
		position: relative;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 12px 22px;
		border-bottom: 1px solid var(--border);
		background: linear-gradient(180deg, var(--panel) 0%, transparent 140%);
		backdrop-filter: blur(6px);
		z-index: 10;
	}
	.topbar::after {
		content: '';
		position: absolute;
		left: 0;
		bottom: -1px;
		width: 100%;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			var(--border-lum) 30%,
			var(--border-lum) 70%,
			transparent
		);
		opacity: 0.6;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 13px;
		text-decoration: none;
	}
	.brand-mark {
		width: 36px;
		height: 36px;
		flex-shrink: 0;
		color: var(--accent);
		filter: drop-shadow(0 0 6px var(--accent-glow));
	}
	.brand-mark svg {
		width: 100%;
		height: 100%;
	}
	.brand-text {
		display: flex;
		flex-direction: column;
		gap: 4px;
		line-height: 1;
	}
	.brand-sys {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 19px;
		letter-spacing: 0.02em;
		color: var(--text);
		white-space: nowrap;
	}
	.brand-sub {
		font-family: var(--font-display);
		font-weight: 500;
		font-size: 9.5px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--text-dim);
		white-space: nowrap;
	}

	.topbar-spacer {
		flex: 1;
	}

	.cycle-pill {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 7px 13px;
		border: 1px solid var(--border);
		background: var(--panel-2);
		font-family: var(--font-display);
		font-weight: 500;
		font-size: 10.5px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-dim);
		white-space: nowrap;
	}
	.cycle-pill b {
		color: var(--accent);
		font-weight: 700;
	}
	.cycle-dot {
		width: 7px;
		height: 7px;
		background: var(--accent);
		box-shadow: 0 0 7px var(--accent);
		animation: blink 1.1s steps(1) infinite;
	}
	@keyframes blink {
		0%,
		50% {
			opacity: 1;
		}
		51%,
		100% {
			opacity: 0.15;
		}
	}

	.topnav {
		display: flex;
		gap: 2px;
	}
	.nav-link {
		padding: 9px 13px;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 11px;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		color: var(--text-dim);
		text-decoration: none;
		border: 1px solid transparent;
		transition:
			color 0.12s,
			border-color 0.12s,
			background 0.12s;
	}
	.nav-link:hover {
		color: var(--accent);
	}
	.nav-link.active {
		color: var(--accent);
		border-color: var(--border);
		background: var(--accent-soft);
	}

	.content {
		flex: 1;
		min-height: 0;
		position: relative;
		overflow-y: auto;
	}

	@media (max-width: 1000px) {
		.cycle-pill {
			display: none;
		}
	}
	@media (max-width: 720px) {
		.topbar {
			gap: 10px;
			padding: 11px 14px;
		}
		.brand-sys {
			font-size: 17px;
		}
		.brand-sub {
			display: none;
		}
		.nav-link {
			padding: 8px 9px;
			font-size: 10px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.cycle-dot {
			animation: none;
		}
	}
</style>
