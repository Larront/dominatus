<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const { form, errors, enhance, message, submitting } = superForm(data.form, { dataType: 'json' });

	// Image-analysis seam (ADR 0001): the upload is optional and only ever produces a
	// draft the commander confirms. The dedicated CV stack is a later vertical slice;
	// for now the control is present but inert.
	let imageFile = $state<File | null>(null);
	function onImagePick(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		imageFile = input.files?.[0] ?? null;
	}
</script>

<main class="mx-auto max-w-2xl p-8">
	<h1 class="font-display text-2xl" style="color: var(--accent)">Submit battle report</h1>
	<p class="mt-1 text-sm" style="color: var(--text-dim)">
		Upload a photo to auto-fill, or enter the result by hand. You confirm before it is logged.
	</p>

	{#if $message}
		<p class="mt-4 border p-3 text-sm" style="border-color: var(--accent); color: var(--accent)">
			{$message}
		</p>
	{/if}

	<!-- Optional image → CV draft seam -->
	<section class="mt-6 border p-4" style="border-color: var(--border)">
		<h2 class="font-display text-sm uppercase">Auto-fill from image (optional)</h2>
		<input type="file" accept="image/*" class="mt-2 text-sm" onchange={onImagePick} />
		<button
			type="button"
			disabled
			class="mt-2 block p-2 font-display text-xs uppercase"
			style="border: 1px solid var(--border); color: var(--text-dim)"
		>
			Analyse image (coming soon)
		</button>
		{#if imageFile}
			<p class="mt-2 text-xs" style="color: var(--text-dim)">Selected: {imageFile.name}</p>
		{/if}
	</section>

	<form method="POST" use:enhance class="mt-6 flex flex-col gap-4">
		<label class="flex flex-col gap-1 text-sm">
			World
			<select
				bind:value={$form.worldId}
				class="border p-2"
				style="background: var(--bg-1); border-color: var(--border)"
			>
				<option value="" disabled>Select a world</option>
				{#each data.worlds as world (world.id)}
					<option value={world.id}>{world.name}</option>
				{/each}
			</select>
			{#if $errors.worldId}<span style="color: var(--accent)">{$errors.worldId}</span>{/if}
		</label>

		<div class="grid grid-cols-2 gap-4">
			<label class="flex flex-col gap-1 text-sm">
				Attacker warband
				<select
					bind:value={$form.combatants[0].warbandId}
					class="border p-2"
					style="background: var(--bg-1); border-color: var(--border)"
				>
					<option value="" disabled>Select</option>
					{#each data.warbands as warband (warband.id)}
						<option value={warband.id}>{warband.name}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1 text-sm">
				Defender warband
				<select
					bind:value={$form.combatants[1].warbandId}
					class="border p-2"
					style="background: var(--bg-1); border-color: var(--border)"
				>
					<option value="" disabled>Select</option>
					{#each data.warbands as warband (warband.id)}
						<option value={warband.id}>{warband.name}</option>
					{/each}
				</select>
			</label>
		</div>
		{#if $errors.combatants?._errors}
			<span class="text-sm" style="color: var(--accent)">{$errors.combatants._errors}</span>
		{/if}
		<p class="text-xs" style="color: var(--text-dim)">2v2 entry is a follow-up; 1v1 for now.</p>

		<div class="grid grid-cols-2 gap-4">
			<label class="flex flex-col gap-1 text-sm">
				Outcome
				<select
					bind:value={$form.outcome}
					class="border p-2"
					style="background: var(--bg-1); border-color: var(--border)"
				>
					<option value="attacker">Attacker won</option>
					<option value="defender">Defender held</option>
					<option value="stalemate">Stalemate</option>
				</select>
			</label>
			<label class="flex flex-col gap-1 text-sm">
				Points size
				<input
					type="number"
					bind:value={$form.pointsSize}
					class="border p-2"
					style="background: var(--bg-1); border-color: var(--border)"
				/>
			</label>
		</div>

		<label class="flex flex-col gap-1 text-sm">
			Narrative
			<textarea
				bind:value={$form.narrative}
				rows="4"
				class="border p-2"
				style="background: var(--bg-1); border-color: var(--border)"
			></textarea>
		</label>

		<button
			type="submit"
			disabled={$submitting}
			class="p-2 font-display uppercase"
			style="background: var(--accent); color: var(--bg-0)"
		>
			{$submitting ? 'Submitting…' : 'Confirm & submit'}
		</button>
	</form>
</main>
