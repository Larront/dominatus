<script lang="ts">
	import { goto } from '$app/navigation';
	import { signIn } from '$lib/auth-client';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMsg = $state<string | null>(null);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		loading = true;
		errorMsg = null;
		const { error } = await signIn.email({ email, password });
		loading = false;
		if (error) {
			errorMsg = error.message ?? 'Sign in failed';
			return;
		}
		await goto('/');
	}
</script>

<main class="mx-auto max-w-sm p-8">
	<h1 class="font-display text-2xl" style="color: var(--accent)">Sign in</h1>

	<form class="mt-6 flex flex-col gap-4" onsubmit={submit}>
		<label class="flex flex-col gap-1 text-sm">
			Email
			<input
				type="email"
				bind:value={email}
				required
				class="border p-2"
				style="background: var(--bg-1); border-color: var(--border)"
			/>
		</label>
		<label class="flex flex-col gap-1 text-sm">
			Password
			<input
				type="password"
				bind:value={password}
				required
				class="border p-2"
				style="background: var(--bg-1); border-color: var(--border)"
			/>
		</label>

		{#if errorMsg}
			<p class="text-sm" style="color: var(--accent)">{errorMsg}</p>
		{/if}

		<button
			type="submit"
			disabled={loading}
			class="p-2 font-display uppercase"
			style="background: var(--accent); color: var(--bg-0)"
		>
			{loading ? 'Signing in…' : 'Sign in'}
		</button>
	</form>

	<p class="mt-4 text-sm" style="color: var(--text-dim)">
		No account? <a href="/signup" style="color: var(--accent)">Enlist</a>
	</p>
</main>
