<script lang="ts">
	import { signUp } from '$lib/auth-client';
	import Button from '$lib/components/ui/Button.svelte';
	import SocialSignIn from '$lib/components/SocialSignIn.svelte';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMsg = $state<string | null>(null);
	// Email + password requires verification, so we land on a "check your inbox"
	// state rather than signing in immediately.
	let verifySent = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		loading = true;
		errorMsg = null;
		const { error } = await signUp.email({ name, email, password });
		loading = false;
		if (error) {
			errorMsg = error.message ?? 'Sign up failed';
			return;
		}
		verifySent = true;
	}

	const lbl = 'font-display text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-dim';
	const field =
		'w-full bg-void border border-border px-3 py-2.5 font-body text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent-mid),0_0_14px_var(--color-accent-soft)]';
</script>

<main class="mx-auto max-w-sm p-8">
	<h1 class="font-display text-2xl font-bold text-accent">Enlist</h1>

	{#if verifySent}
		<p class="mt-6 font-body text-[13px] text-ink-dim">
			Check <span class="text-ink">{email}</span> for a verification link to finish enlisting.
		</p>
		<p class="mt-4 font-body text-[13px] text-ink-dim">
			<a href="/login" class="text-accent hover:underline">Back to sign in</a>
		</p>
	{:else}
		<form class="mt-6 flex flex-col gap-4" onsubmit={submit}>
			<label class="flex flex-col gap-1.5">
				<span class={lbl}>Commander name</span>
				<input bind:value={name} required class={field} />
			</label>
			<label class="flex flex-col gap-1.5">
				<span class={lbl}>Email</span>
				<input type="email" bind:value={email} required class={field} />
			</label>
			<label class="flex flex-col gap-1.5">
				<span class={lbl}>Password</span>
				<input type="password" bind:value={password} required class={field} />
			</label>

			{#if errorMsg}
				<p class="font-body text-[12px] text-state-attacker">{errorMsg}</p>
			{/if}

			<Button type="submit" variant="primary" disabled={loading}>
				{loading ? 'Enlisting…' : 'Enlist'}
			</Button>
		</form>

		<div class="mt-4">
			<SocialSignIn />
		</div>

		<p class="mt-4 font-body text-[13px] text-ink-dim">
			Already enlisted? <a href="/login" class="text-accent hover:underline">Sign in</a>
		</p>
	{/if}
</main>
