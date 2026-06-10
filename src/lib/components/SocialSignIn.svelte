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
		<!-- Monochrome brand marks inherit currentColor, tinting with the button text (ink-dim →
		     accent on hover) so they sit in the console aesthetic rather than fighting it. -->
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path
				d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c7.067 0 11.755-4.969 11.755-11.965 0-.804-.086-1.414-.192-2.03H12.24z"
			/>
		</svg>
		{pending === 'google' ? 'Redirecting…' : 'Continue with Google'}
	</Button>
	<Button type="button" disabled={pending !== null} onclick={() => social('facebook')}>
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path
				d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
			/>
		</svg>
		{pending === 'facebook' ? 'Redirecting…' : 'Continue with Facebook'}
	</Button>
</div>
