<script lang="ts">
	import { requestPasswordReset } from '$lib/auth-client';
	import Button from '$lib/components/ui/Button.svelte';
	import AuthTerminal from '$lib/components/AuthTerminal.svelte';

	let email = $state('');
	let loading = $state(false);
	let sent = $state(false);
	let errorMsg = $state<string | null>(null);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		loading = true;
		errorMsg = null;
		// better-auth appends `?token=` to redirectTo and mails the resulting link.
		const { error } = await requestPasswordReset({ email, redirectTo: '/reset-password' });
		loading = false;
		if (error) {
			// A transport failure is worth surfacing; an unknown address is not — better-auth
			// already returns success for those, so the neutral state never reveals who's enrolled.
			errorMsg = 'Could not send the reset link. Check your connection and try again.';
			return;
		}
		sent = true;
	}

	const label = 'font-display text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-dim';
	const field =
		'w-full bg-void border border-border px-[11px] py-2.5 font-body text-[13px] text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent-mid),0_0_14px_var(--color-accent-soft)]';
</script>

{#snippet backLink()}
	Remembered it?
	<a href="/enter" class="text-accent transition-colors duration-150 hover:underline">Sign in</a>
{/snippet}

<AuthTerminal kicker="// Recover Access" footer={backLink}>
	{#if sent}
		<p class="font-body text-[13px] leading-[1.55] text-ink-dim">
			If <span class="text-ink">{email}</span> is on the rolls, a reset link is inbound. Follow it
			to set a new password — the link expires after a short while.
		</p>
	{:else}
		<p class="mb-4 font-body text-[13px] leading-[1.55] text-ink-dim">
			Enter the email tied to your commander. We'll send a link to set a new password.
		</p>
		<form class="flex flex-col gap-3.5" onsubmit={submit}>
			<label class="flex flex-col gap-1.5">
				<span class={label}>› Email</span>
				<input type="email" bind:value={email} required autocomplete="email" class={field} />
			</label>

			{#if errorMsg}
				<p class="font-body text-[12px] text-state-attacker" role="alert">{errorMsg}</p>
			{/if}

			<Button type="submit" variant="primary" disabled={loading} class="mt-1 w-full">
				{loading ? 'Sending…' : 'Send reset link'}
			</Button>
		</form>
	{/if}
</AuthTerminal>
