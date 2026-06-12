<script lang="ts">
	import { goto } from '$app/navigation';
	import { resetPassword } from '$lib/auth-client';
	import Button from '$lib/components/ui/Button.svelte';
	import PasswordField from '$lib/components/PasswordField.svelte';
	import AuthTerminal from '$lib/components/AuthTerminal.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// A usable link carries a token and no error flag; anything else is a dead link.
	const validLink = $derived(Boolean(data.token) && !data.tokenError);

	let password = $state('');
	let confirm = $state('');
	let loading = $state(false);
	let errorMsg = $state<string | null>(null);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		errorMsg = null;
		if (password !== confirm) {
			errorMsg = "Those passwords don't match.";
			return;
		}
		if (!data.token) return;
		loading = true;
		const { error } = await resetPassword({ newPassword: password, token: data.token });
		loading = false;
		if (error) {
			errorMsg = error.message ?? 'Could not reset your password. Request a fresh link and retry.';
			return;
		}
		// Password set — drop straight onto the hub (signed in if better-auth returned a session).
		await goto('/', { invalidateAll: true });
	}
</script>

{#snippet backLink()}
	<a href="/" class="text-accent transition-colors duration-150 hover:underline">Back to sign in</a>
{/snippet}

<AuthTerminal kicker="// Reset Cipher" footer={backLink}>
	{#if validLink}
		<p class="mb-4 font-body text-[13px] leading-[1.55] text-ink-dim">
			Set a new password for your commander. Use at least 8 characters.
		</p>
		<form class="flex flex-col gap-3.5" onsubmit={submit}>
			<PasswordField
				bind:value={password}
				label="› New password"
				autocomplete="new-password"
				minlength={8}
			/>

			<PasswordField
				bind:value={confirm}
				label="› Confirm password"
				autocomplete="new-password"
				minlength={8}
			/>

			{#if errorMsg}
				<p class="font-body text-[12px] text-state-attacker" role="alert">{errorMsg}</p>
			{/if}

			<Button type="submit" variant="primary" disabled={loading} class="mt-1 w-full">
				{loading ? 'Updating…' : 'Set new password'}
			</Button>
		</form>
	{:else}
		<p class="font-body text-[13px] leading-[1.55] text-ink-dim">
			This reset link has expired or has already been used. Request a fresh one to continue.
		</p>
		<div class="mt-5">
			<Button href="/forgot-password" variant="primary" class="w-full">Request a new link</Button>
		</div>
	{/if}
</AuthTerminal>
