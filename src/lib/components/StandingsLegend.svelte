<script lang="ts">
	interface Standing {
		id: string;
		name: string;
		short: string;
		color: string;
		held: number;
		you: boolean;
	}

	let { standings }: { standings: Standing[] } = $props();

	let open = $state(true);
	const panelId = 'standings-body';
</script>

<aside class="legend" class:collapsed={!open}>
	<button
		class="legend-head"
		onclick={() => (open = !open)}
		aria-expanded={open}
		aria-controls={panelId}
	>
		<span class="legend-title">Warband Standings</span>
		<svg class="legend-chev" viewBox="0 0 14 14" aria-hidden="true">
			<path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" />
		</svg>
	</button>

	{#if open}
		<div class="legend-body" id={panelId}>
			<div class="legend-cols">
				<span>Warband</span>
				<span>Worlds</span>
			</div>
			{#each standings as wb (wb.id)}
				<div class="standing-row">
					<span class="standing-swatch" style="color: {wb.color}; background: {wb.color}"></span>
					<span class="standing-name">
						{wb.name}
						{#if wb.you}<span class="you-tag">You</span>{/if}
					</span>
					<span class="standing-count">{wb.held}</span>
				</div>
			{:else}
				<p class="legend-empty">No warbands have mustered yet.</p>
			{/each}
		</div>
	{/if}
</aside>

<style>
	.legend {
		position: absolute;
		left: 20px;
		bottom: 20px;
		z-index: 6;
		width: 256px;
		background: color-mix(in srgb, var(--panel) 86%, transparent);
		border: 1px solid var(--border);
		backdrop-filter: blur(8px);
		overflow: hidden;
	}
	.legend::before {
		content: '';
		position: absolute;
		inset: 0 0 auto 0;
		height: 2px;
		background: linear-gradient(90deg, var(--accent), transparent 70%);
		opacity: 0.7;
	}

	.legend-head {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 12px 14px;
		background: none;
		border: none;
		cursor: pointer;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 10.5px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-dim);
		transition: color 0.12s;
	}
	.legend-head:hover,
	.legend-head:focus-visible {
		color: var(--accent);
		outline: none;
	}
	.legend-title::before {
		content: '▸ ';
		color: var(--accent);
	}
	.legend-chev {
		width: 13px;
		height: 13px;
		flex-shrink: 0;
		color: var(--accent);
		transition: transform 0.2s ease;
	}
	.legend.collapsed .legend-chev {
		transform: rotate(-90deg);
	}

	.legend-body {
		padding: 0 14px 12px;
	}
	.legend-cols {
		display: flex;
		justify-content: space-between;
		font-family: var(--font-display);
		font-weight: 500;
		font-size: 9px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-faint);
		padding-bottom: 8px;
		margin-bottom: 4px;
		border-bottom: 1px solid var(--border);
	}
	.standing-row {
		display: grid;
		grid-template-columns: 12px 1fr auto;
		align-items: center;
		gap: 10px;
		padding: 7px 0;
		font-family: var(--font-body);
		font-size: 13px;
	}
	.standing-row + .standing-row {
		border-top: 1px solid var(--border);
	}
	.standing-swatch {
		width: 11px;
		height: 11px;
		box-shadow: 0 0 8px currentColor;
	}
	.standing-name {
		color: var(--text);
		line-height: 1.2;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.you-tag {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 8.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 2px 4px;
		border: 1px solid var(--accent-mid);
		color: var(--accent);
	}
	.standing-count {
		font-family: var(--font-body);
		font-weight: 600;
		font-size: 15px;
		color: var(--accent);
		line-height: 1;
	}
	.legend-empty {
		font-family: var(--font-body);
		font-size: 12px;
		color: var(--text-dim);
		line-height: 1.5;
	}
</style>
