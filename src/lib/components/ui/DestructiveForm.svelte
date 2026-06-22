<script lang="ts">
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import { untrack, type Snippet } from 'svelte';
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
		reasonPrompt = undefined,
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
		/**
		 * If set, the submit opens a prompt() seeded with this message instead of a confirm(): the
		 * arbiter can type an optional reason (posted as `reason`) and OK to proceed, or Cancel to
		 * abort. Empty text still proceeds — the reason never blocks (issue #6). Takes precedence over
		 * `confirm`, so the prompt doubles as the confirmation step.
		 */
		reasonPrompt?: string;
		ariaLabel?: string;
		class?: string;
		children: Snippet;
	} = $props();

	const { form: fields, submitting, enhance } = untrack(() => superForm(form, { id: formId }));
	// Seed the row's id so client validation passes and the POST carries it.
	$fields.id = untrack(() => recordId);

	// The optional reason rides as a hidden field. We set its DOM value synchronously in the click
	// handler (not via a reactive binding) so it is present when enhance serialises the form on submit.
	let reasonInput = $state<HTMLInputElement>();
</script>

<form method="POST" {action} use:enhance>
	<input type="hidden" name="id" value={recordId} />
	{#if reasonPrompt !== undefined}
		<input type="hidden" name="reason" bind:this={reasonInput} />
	{/if}
	<button
		type="submit"
		disabled={$submitting}
		aria-label={ariaLabel}
		class={klass}
		onclick={(e) => {
			if (reasonPrompt !== undefined) {
				const r = window.prompt(reasonPrompt);
				if (r === null) {
					e.preventDefault(); // arbiter cancelled — abort the action
					return;
				}
				if (reasonInput) reasonInput.value = r; // empty string is fine; the reason never blocks
			} else if (confirmMessage && !window.confirm(confirmMessage)) {
				e.preventDefault();
			}
		}}
	>
		{@render children()}
	</button>
</form>
