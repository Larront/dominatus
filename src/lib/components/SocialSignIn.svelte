<script lang="ts">
	import { signIn } from '$lib/auth-client';
	import Button from '$lib/components/ui/Button.svelte';

	// Tracks which provider is mid-redirect so both buttons disable together.
	let pending = $state<'google' | 'facebook' | null>(null);

	async function social(provider: 'google' | 'facebook') {
		pending = provider;
		await signIn.social({ provider, callbackURL: '/' });
	}

	const lbl = 'font-display text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-faint';
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-center gap-3">
		<span class="h-px flex-1 bg-border"></span>
		<span class={lbl}>or</span>
		<span class="h-px flex-1 bg-border"></span>
	</div>
	<Button type="button" disabled={pending !== null} onclick={() => social('google')}>
		{pending === 'google' ? 'Redirecting…' : 'Continue with Google'}
	</Button>
	<Button type="button" disabled={pending !== null} onclick={() => social('facebook')}>
		{pending === 'facebook' ? 'Redirecting…' : 'Continue with Facebook'}
	</Button>
</div>
