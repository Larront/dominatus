<script lang="ts">
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import type { Snippet } from 'svelte';
	import type { IdActionInput } from '$lib/schemas/id-action';

	// A Superforms-backed single-button form for an id-only destructive action in a list. Each
	// instance gets its own `formId` so the server's response routes back to the row it came from
	// (a shared id would make every row react to one delete). `recordId` seeds the only field.
	let {
		form,
		formId,
		action,
		recordId,
		confirm: confirmMessage = undefined,
		ariaLabel = undefined,
		class: klass = '',
		children
	}: {
		form: SuperValidated<IdActionInput>;
		formId: string;
		action: string;
		recordId: string;
		/** If set, the submit is gated behind a confirm() dialog. */
		confirm?: string;
		ariaLabel?: string;
		class?: string;
		children: Snippet;
	} = $props();

	const { form: fields, submitting, enhance } = superForm(form, { id: formId });
	// Seed the row's id so client validation passes and the POST carries it.
	$fields.id = recordId;
</script>

<form method="POST" {action} use:enhance>
	<input type="hidden" name="id" value={recordId} />
	<button
		type="submit"
		disabled={$submitting}
		aria-label={ariaLabel}
		class={klass}
		onclick={(e) => {
			if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
		}}
	>
		{@render children()}
	</button>
</form>
