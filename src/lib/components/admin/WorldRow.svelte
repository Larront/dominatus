<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import { enhance as kitEnhance } from '$app/forms';
	import type { WorldEditInput } from '$lib/schemas/campaign-founding';
	import type { WorldWithControl } from '$lib/domain/world';
	import Button from '$lib/components/ui/Button.svelte';
	import Planet from '$lib/components/Planet.svelte';

	// One charted world: edit its details (its own Superform, id carried from the load) plus the
	// effects-in-play toggles. The toggles are plain command posts — no user input to validate.
	let {
		world,
		editForm,
		effects,
		archetypes,
		control,
		label
	}: {
		world: WorldWithControl;
		editForm: SuperValidated<WorldEditInput>;
		effects: { id: string; title: string; description: string | null }[];
		archetypes: { value: string; label: string }[];
		control: string;
		label: string;
	} = $props();

	const { form, errors, message, submitting, enhance } = untrack(() =>
		superForm(editForm, { resetForm: false })
	);
	const attached = $derived(new Set(world.effects.map((e) => e.id)));
</script>

<article class="border border-border bg-panel-2/40 p-3.5">
	<form method="POST" action="?/saveWorld" class="flex flex-col gap-3" use:enhance>
		<input type="hidden" name="worldId" value={$form.worldId} />
		<div class="flex items-center gap-3">
			<span class="shrink-0 leading-[0]">
				<Planet render={$form.render} size={44} resolution={64} name={$form.name} />
			</span>
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				<input
					name="name"
					bind:value={$form.name}
					maxlength="60"
					class="{control} py-2 font-display text-[14px] font-semibold"
					aria-label="World name"
					aria-invalid={$errors.name ? 'true' : undefined}
				/>
				{#if $errors.name}<span class="font-body text-[12px] text-state-attacker">{$errors.name}</span>{/if}
			</div>
		</div>
		<div class="grid grid-cols-2 gap-2 max-[560px]:grid-cols-1">
			<label class="flex flex-col gap-1">
				<span class="{label} text-[9px]">› Type</span>
				<input name="type" bind:value={$form.type} maxlength="60" class="{control} py-2" />
			</label>
			<label class="flex flex-col gap-1">
				<span class="{label} text-[9px]">› Archetype</span>
				<select name="render" bind:value={$form.render} class="{control} py-2">
					{#each archetypes as a (a.value)}
						<option value={a.value}>{a.label}</option>
					{/each}
				</select>
			</label>
		</div>
		<div class="grid grid-cols-3 gap-2 max-[560px]:grid-cols-1">
			<label class="flex flex-col gap-1">
				<span class="{label} text-[9px]">› Value</span>
				<input name="value" bind:value={$form.value} maxlength="40" class="{control} py-2" />
			</label>
			<label class="flex flex-col gap-1">
				<span class="{label} text-[9px]">› Garrison</span>
				<input name="garrison" bind:value={$form.garrison} maxlength="40" class="{control} py-2" />
			</label>
			<label class="flex flex-col gap-1">
				<span class="{label} text-[9px]">› Supply</span>
				<input name="supply" bind:value={$form.supply} maxlength="40" class="{control} py-2" />
			</label>
		</div>
		<label class="flex flex-col gap-1">
			<span class="{label} text-[9px]">› Lore</span>
			<textarea
				name="description"
				bind:value={$form.description}
				rows="2"
				maxlength="400"
				class="{control} resize-none py-2 leading-[1.45]"
			></textarea>
		</label>
		<div class="flex items-center justify-end gap-3">
			{#if $message}<span class="font-body text-[12px] text-accent">{$message}</span>{/if}
			<Button type="submit" class="px-3 py-1.5" disabled={$submitting}>
				{$submitting ? 'Saving…' : 'Save world'}
			</Button>
		</div>
	</form>

	<div class="mt-3 border-t border-border pt-3">
		<span class="{label} text-[9px]">› Effects in play</span>
		{#if effects.length === 0}
			<p class="mt-1.5 font-body text-[11.5px] text-ink-faint">
				No effects in the pool — add some above to assign them here.
			</p>
		{:else}
			<div class="mt-2 flex flex-wrap gap-1.5">
				{#each effects as e (e.id)}
					{@const on = attached.has(e.id)}
					<form method="POST" action="?/{on ? 'detachEffect' : 'attachEffect'}" use:kitEnhance>
						<input type="hidden" name="worldId" value={world.id} />
						<input type="hidden" name="effectId" value={e.id} />
						<button
							type="submit"
							title={e.description ?? ''}
							class="border px-2 py-1 font-display text-[10.5px] font-medium tracking-[0.04em] transition-colors focus-visible:outline-none {on
								? 'border-accent-mid bg-accent-soft text-accent'
								: 'border-border bg-panel text-ink-dim hover:border-border-lum hover:text-ink'}"
						>
							{on ? '✓' : '+'} {e.title}
						</button>
					</form>
				{/each}
			</div>
		{/if}
	</div>
</article>
