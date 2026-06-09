<script lang="ts">
	import { goto } from '$app/navigation';
	import { signIn, signUp } from '$lib/auth-client';
	import Button from '$lib/components/ui/Button.svelte';
	import BrandMark from '$lib/components/BrandMark.svelte';

	// The root's anonymous face: a single access terminal that flips between signing in an
	// existing commander and enlisting a new one. Auth runs client-side via better-auth; a
	// success reloads the route so the server load returns the now-authenticated hub.
	type Mode = 'signin' | 'enlist';
	let mode = $state<Mode>('signin');
	let name = $state('');
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMsg = $state<string | null>(null);

	function setMode(next: Mode) {
		if (next === mode) return;
		mode = next;
		errorMsg = null;
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		loading = true;
		errorMsg = null;
		const { error } =
			mode === 'signin'
				? await signIn.email({ email, password })
				: await signUp.email({ name, email, password });
		loading = false;
		if (error) {
			errorMsg = error.message ?? (mode === 'signin' ? 'Sign in failed.' : 'Enlistment failed.');
			return;
		}
		await goto('/', { invalidateAll: true });
	}

	const label = 'font-display text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-dim';
	const field =
		'w-full bg-void border border-border px-[11px] py-2.5 font-body text-[13px] text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent-mid),0_0_14px_var(--color-accent-soft)]';
	const tab =
		'flex-1 border px-3 py-2 font-display text-[10.5px] font-semibold tracking-[0.12em] uppercase transition-[color,background-color,border-color] duration-150 cursor-pointer focus-visible:outline-none focus-visible:border-accent focus-visible:text-accent';
</script>

<div class="flex min-h-[100dvh] items-center justify-center px-5 py-16">
	<div class="w-full max-w-[400px]">
		<div class="mb-7 flex flex-col items-center text-center">
			<BrandMark class="mb-4 size-12 text-accent drop-shadow-[0_0_10px_var(--color-accent-glow)]" />
			<h1 class="font-display text-[26px] font-bold tracking-[0.04em] text-ink">DOMINATUS</h1>
			<p class="mt-1.5 font-display text-[10px] font-medium tracking-[0.18em] text-ink-dim uppercase">
				Campaign Cogitator
			</p>
		</div>

		<div
			class="relative border border-border bg-panel px-6 pt-6 pb-7 before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-[linear-gradient(90deg,var(--color-accent),transparent_70%)] before:opacity-70 before:content-['']"
		>
			<p class="mb-4 font-display text-[10px] font-semibold tracking-[0.14em] text-accent uppercase">
				// Access Required
			</p>

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
					<input
						type="email"
						bind:value={email}
						required
						autocomplete="email"
						class={field}
					/>
				</label>

				<label class="flex flex-col gap-1.5">
					<span class={label}>› Password</span>
					<input
						type="password"
						bind:value={password}
						required
						autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
						class={field}
					/>
				</label>

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
		</div>

		<p class="mt-4 text-center font-body text-[12px] text-ink-faint">
			{mode === 'signin' ? 'New to the front?' : 'Already serving?'}
			<button
				type="button"
				onclick={() => setMode(mode === 'signin' ? 'enlist' : 'signin')}
				class="cursor-pointer text-accent transition-colors duration-150 hover:underline"
			>
				{mode === 'signin' ? 'Enlist a commander' : 'Sign in'}
			</button>
		</p>
	</div>
</div>
