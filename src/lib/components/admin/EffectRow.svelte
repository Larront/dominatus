<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import type { EffectEditInput } from '$lib/schemas/planetary-effect';
	import type { IdActionInput } from '$lib/schemas/id-action';
	import Button from '$lib/components/ui/Button.svelte';
	import DestructiveForm from '$lib/components/ui/DestructiveForm.svelte';

	// One pooled planetary effect: edit (its own Superform, id carried from the load so the save
	// response routes back here) plus an id-only remove via the shared DestructiveForm pattern.
	let {
		editForm,
		deleteForm,
		control
	}: {
		editForm: SuperValidated<EffectEditInput>;
		deleteForm: SuperValidated<IdActionInput>;
		control: string;
	} = $props();

	const { form, errors, message, submitting, enhance } = untrack(() =>
		superForm(editForm, { resetForm: false })
	);
</script>

<li class="border border-border bg-panel-2/50 p-2.5">
	<form method="POST" action="?/editEffect" class="flex items-start gap-2.5" use:enhance>
		<input type="hidden" name="id" value={$form.id} />
		<div class="flex min-w-0 flex-1 flex-col gap-2">
			<input
				name="title"
				bind:value={$form.title}
				maxlength="60"
				class="{control} py-2 font-display text-[13px] font-semibold"
				aria-invalid={$errors.title ? 'true' : undefined}
			/>
			{#if $errors.title}<span class="font-body text-[12px] text-state-attacker"
					>{$errors.title}</span
				>{/if}
			<textarea
				name="description"
				bind:value={$form.description}
				rows="2"
				maxlength="400"
				class="{control} resize-none py-2 leading-[1.45]"
			></textarea>
		</div>
		<div class="flex flex-col items-end gap-1.5">
			<Button type="submit" class="px-2.5 py-1.5" disabled={$submitting}>
				{$submitting ? 'Saving…' : 'Save'}
			</Button>
			{#if $message}<span class="font-body text-[11px] text-accent">{$message}</span>{/if}
		</div>
	</form>
	<div class="mt-1.5 flex justify-end">
		<DestructiveForm
			form={deleteForm}
			formId="effect-del-{$form.id}"
			action="?/deleteEffect"
			recordId={$form.id}
			confirm="Remove this effect from the pool?"
			class="cursor-pointer font-display text-[10px] tracking-[0.08em] text-ink-faint uppercase transition-colors hover:text-state-attacker focus-visible:outline-none"
		>
			Remove from pool
		</DestructiveForm>
	</div>
</li>
