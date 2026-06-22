<script lang="ts">
	import { enhance } from '$app/forms';
	import { type SuperValidated } from 'sveltekit-superforms';
	import type { IdActionInput } from '$lib/schemas/id-action';
	import DestructiveForm from './DestructiveForm.svelte';

	// The image controls for one painting award: a thumbnail (when set) plus attach/replace and
	// remove. Posts to the standings page's `setAwardImage`/`removeAwardImage` actions, which apply
	// the one write rule (arbiter or the warband's commander). `removeForm` seeds the id-only remove
	// button; `error` is the action's message for this award, matched by id in the parent.
	let {
		awardId,
		imagePath,
		slug,
		removeForm,
		error = undefined
	}: {
		awardId: string;
		imagePath: string | null;
		slug: string;
		removeForm: SuperValidated<IdActionInput>;
		error?: string;
	} = $props();

	const src = $derived(`/campaigns/${slug}/award/image/${imagePath}`);
	let submitting = $state(false);
	let fileInput = $state<HTMLInputElement>();
</script>

<div class="mt-2 flex flex-wrap items-center gap-2.5">
	{#if imagePath}
		<a href={src} target="_blank" rel="noopener" class="shrink-0">
			<img
				{src}
				alt="Painted models for this award"
				class="size-12 border border-border object-cover"
			/>
		</a>
	{/if}

	<form
		method="POST"
		action="?/setAwardImage"
		enctype="multipart/form-data"
		class="flex flex-wrap items-center gap-2"
		use:enhance={() => {
			submitting = true;
			return async ({ update, result }) => {
				await update();
				// Clear the picker on success so the same row is ready for a future replace.
				if (result.type === 'success' && fileInput) fileInput.value = '';
				submitting = false;
			};
		}}
	>
		<input type="hidden" name="id" value={awardId} />
		<input
			bind:this={fileInput}
			type="file"
			name="image"
			accept="image/jpeg,image/png,image/webp"
			class="max-w-full font-body text-[11px] text-ink-faint file:mr-2 file:cursor-pointer file:border file:border-border file:bg-panel-2 file:px-2 file:py-1 file:font-display file:text-[9.5px] file:tracking-[0.08em] file:text-ink-dim file:uppercase"
		/>
		<button
			type="submit"
			disabled={submitting}
			class="border border-border px-2 py-1 font-display text-[10px] tracking-[0.08em] text-ink-dim uppercase transition-colors hover:border-accent-mid hover:text-accent disabled:opacity-60"
		>
			{submitting ? 'Saving…' : imagePath ? 'Replace' : 'Attach'}
		</button>
	</form>

	{#if imagePath}
		<DestructiveForm
			form={removeForm}
			formId="award-image-remove-{awardId}"
			action="?/removeAwardImage"
			recordId={awardId}
			confirm="Remove this award image?"
			ariaLabel="Remove award image"
			class="border border-transparent px-1.5 py-0.5 font-display text-[10px] tracking-[0.08em] text-ink-faint uppercase transition-colors hover:border-state-attacker-line hover:text-state-attacker focus-visible:outline-none"
		>
			Remove
		</DestructiveForm>
	{/if}

	{#if error}
		<p class="w-full font-body text-[12px] text-state-attacker">{error}</p>
	{/if}
</div>
