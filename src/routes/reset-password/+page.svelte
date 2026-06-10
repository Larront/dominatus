<script lang="ts">
	import { goto } from '$app/navigation';
	import { resetPassword } from '$lib/auth-client';
	import Button from '$lib/components/ui/Button.svelte';
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

	const label = 'font-display text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-dim';
	const field =
		'w-full bg-void border border-border px-[11px] py-2.5 font-body text-[13px] text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent-mid),0_0_14px_var(--color-accent-soft)]';
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
			<label class="flex flex-col gap-1.5">
				<span class={label}>› New password</span>
				<input
					type="password"
					bind:value={password}
					required
					minlength="8"
					autocomplete="new-password"
					class={field}
				/>
			</label>

			<label class="flex flex-col gap-1.5">
				<span class={label}>› Confirm password</span>
				<input
					type="password"
					bind:value={confirm}
					required
					minlength="8"
					autocomplete="new-password"
					class={field}
				/>
			</label>

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
