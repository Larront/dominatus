<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onDestroy } from 'svelte';
	import { signIn, signUp, sendVerificationEmail } from '$lib/auth-client';
	import Button from '$lib/components/ui/Button.svelte';
	import PasswordField from '$lib/components/PasswordField.svelte';
	import SocialSignIn from '$lib/components/SocialSignIn.svelte';
	import AuthTerminal from '$lib/components/AuthTerminal.svelte';

	// The root's anonymous face: one access terminal that flips between signing in an existing
	// commander and enlisting a new one. Email+password enlistment requires verification, so a
	// fresh enlistment — or a sign-in blocked on an unverified address — lands on a check-inbox
	// phase that can re-dispatch the link. A live sign-in reloads the route so the server load
	// returns the now-authenticated hub.
	type Mode = 'signin' | 'enlist';
	// How we landed on the verify phase: a fresh enlistment ('enlisted') vs a sign-in blocked because
	// the address is still unverified ('unverified'). Drives distinct copy so a blocked sign-in
	// plainly reads as "you haven't verified yet" rather than "we just sent you a link".
	let verifyReason = $state<'enlisted' | 'unverified'>('enlisted');
	// Open straight to the tab the entry link asked for — the splash "Enlist a commander" CTA links
	// to /enter?mode=enlist; anything else (or no param) lands on sign-in.
	let mode = $state<Mode>(page.url.searchParams.get('mode') === 'enlist' ? 'enlist' : 'signin');
	let phase = $state<'form' | 'verify'>('form');
	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let errorMsg = $state<string | null>(null);

	// Resend cooldown: a short timed lockout so the verify panel can't hammer the mailer.
	let resending = $state(false);
	let cooldown = $state(0);
	let timer: ReturnType<typeof setInterval> | undefined;
	onDestroy(() => clearInterval(timer));

	function setMode(next: Mode) {
		if (next === mode) return;
		mode = next;
		errorMsg = null;
		confirmPassword = '';
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		// Enlistment requires the two password entries to agree before we hit the server.
		if (mode === 'enlist' && password !== confirmPassword) {
			errorMsg = 'Passwords do not match.';
			return;
		}
		loading = true;
		errorMsg = null;
		const { error } =
			mode === 'signin'
				? await signIn.email({ email, password })
				: await signUp.email({ name, email, password });
		loading = false;
		if (error) {
			// An unverified address can't sign in yet (403) — route to the inbox phase, not an error.
			if ((error as { status?: number }).status === 403) {
				verifyReason = 'unverified';
				phase = 'verify';
				return;
			}
			errorMsg = error.message ?? (mode === 'signin' ? 'Sign in failed.' : 'Enlistment failed.');
			return;
		}
		// Enlistment has no session until the email is verified; sign-in is live now.
		if (mode === 'enlist') {
			verifyReason = 'enlisted';
			phase = 'verify';
			return;
		}
		await goto('/', { invalidateAll: true });
	}

	async function resend() {
		if (resending || cooldown > 0) return;
		resending = true;
		await sendVerificationEmail({ email, callbackURL: '/' });
		resending = false;
		cooldown = 30;
		timer = setInterval(() => {
			cooldown -= 1;
			if (cooldown <= 0) clearInterval(timer);
		}, 1000);
	}

	function backToSignIn() {
		phase = 'form';
		mode = 'signin';
		errorMsg = null;
		password = '';
		confirmPassword = '';
	}

	const label = 'font-display text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-dim';
	const field =
		'w-full bg-void border border-border px-[11px] py-2.5 font-body text-[13px] text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent-mid),0_0_14px_var(--color-accent-soft)]';
	const tab =
		'flex-1 border px-3 py-2 font-display text-[10.5px] font-semibold tracking-[0.12em] uppercase transition-[color,background-color,border-color] duration-150 cursor-pointer focus-visible:outline-none focus-visible:border-accent focus-visible:text-accent';
</script>

{#snippet modeSwitch()}
	{mode === 'signin' ? 'New to the front?' : 'Already serving?'}
	<button
		type="button"
		onclick={() => setMode(mode === 'signin' ? 'enlist' : 'signin')}
		class="cursor-pointer text-accent transition-colors duration-150 hover:underline"
	>
		{mode === 'signin' ? 'Enlist a commander' : 'Sign in'}
	</button>
{/snippet}

<AuthTerminal
	kicker={phase === 'verify'
		? verifyReason === 'unverified'
			? '// Verification Required'
			: '// Verify Transmission'
		: '// Access Required'}
	footer={phase === 'form' ? modeSwitch : undefined}
>
	{#if phase === 'verify'}
		{#if verifyReason === 'unverified'}
			<p class="font-body text-[13px] leading-[1.55] text-ink-dim">
				<span class="text-ink">{email}</span> hasn't been verified yet, so sign-in is blocked. Follow
				the link we sent to confirm your address — or have us send a fresh one below — then sign in.
			</p>
		{:else}
			<p class="font-body text-[13px] leading-[1.55] text-ink-dim">
				Verification dispatched to <span class="text-ink">{email}</span>. Follow the link in that
				message to confirm your address and take the field.
			</p>
		{/if}
		<div class="mt-5 flex flex-col gap-3">
			<Button
				type="button"
				variant="primary"
				class="w-full"
				disabled={resending || cooldown > 0}
				onclick={resend}
			>
				{#if resending}
					Resending…
				{:else if cooldown > 0}
					Resend in {cooldown}s
				{:else}
					Resend verification email
				{/if}
			</Button>
			<button
				type="button"
				onclick={backToSignIn}
				class="cursor-pointer font-body text-[12px] text-ink-faint transition-colors duration-150 hover:text-accent"
			>
				Back to sign in
			</button>
		</div>
	{:else}
		<div class="mb-5 flex gap-1.5" role="tablist" aria-label="Choose access mode">
			<button
				type="button"
				role="tab"
				aria-selected={mode === 'signin'}
				onclick={() => setMode('signin')}
				class="{tab} {mode === 'signin'
					? 'border-accent bg-accent-soft text-accent'
					: 'border-border bg-panel-2 text-ink-dim hover:text-ink'}"
			>
				Sign in
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={mode === 'enlist'}
				onclick={() => setMode('enlist')}
				class="{tab} {mode === 'enlist'
					? 'border-accent bg-accent-soft text-accent'
					: 'border-border bg-panel-2 text-ink-dim hover:text-ink'}"
			>
				Enlist
			</button>
		</div>

		<form class="flex flex-col gap-3.5" onsubmit={submit}>
			{#if mode === 'enlist'}
				<label class="flex flex-col gap-1.5">
					<span class={label}>› Commander name</span>
					<input bind:value={name} required autocomplete="name" class={field} />
				</label>
			{/if}

			<label class="flex flex-col gap-1.5">
				<span class={label}>› Email</span>
				<input type="email" bind:value={email} required autocomplete="email" class={field} />
			</label>

			<PasswordField
				bind:value={password}
				label="› Password"
				autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
			/>

			{#if mode === 'enlist'}
				<PasswordField
					bind:value={confirmPassword}
					label="› Confirm password"
					autocomplete="new-password"
				/>
			{/if}

			{#if mode === 'signin'}
				<div class="-mt-1 flex justify-end">
					<a
						href="/forgot-password"
						class="font-body text-[12px] text-ink-dim transition-colors duration-150 hover:text-accent"
					>
						Forgot password?
					</a>
				</div>
			{/if}

			{#if errorMsg}
				<p class="font-body text-[12px] text-state-attacker" role="alert">{errorMsg}</p>
			{/if}

			<Button type="submit" variant="primary" disabled={loading} class="mt-1 w-full">
				{#if mode === 'signin'}
					{loading ? 'Signing in…' : 'Sign in'}
				{:else}
					{loading ? 'Enlisting…' : 'Enlist'}
				{/if}
			</Button>
		</form>

		<div class="mt-4">
			<SocialSignIn />
		</div>
	{/if}
</AuthTerminal>
