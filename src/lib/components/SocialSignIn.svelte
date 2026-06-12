<script lang="ts">
	import { signIn } from '$lib/auth-client';
	import Button from '$lib/components/ui/Button.svelte';

	let pending = $state(false);

	async function google() {
		pending = true;
		await signIn.social({ provider: 'google', callbackURL: '/' });
	}

	const lbl = 'font-display text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-faint';
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-center gap-3">
		<span class="h-px flex-1 bg-border"></span>
		<span class={lbl}>or</span>
		<span class="h-px flex-1 bg-border"></span>
	</div>
	<Button type="button" disabled={pending} onclick={google}>
		<!-- Monochrome brand mark inherits currentColor, tinting with the button text (ink-dim →
		     accent on hover) so it sits in the console aesthetic rather than fighting it. -->
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path
				d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c7.067 0 11.755-4.969 11.755-11.965 0-.804-.086-1.414-.192-2.03H12.24z"
			/>
		</svg>
		{pending ? 'Redirecting…' : 'Continue with Google'}
	</Button>
</div>
