<script lang="ts">
	import { deleteUser } from '$lib/auth-client';
	import Button from '$lib/components/ui/Button.svelte';

	// Account-level "Danger Zone" — shared by the campaign dossier and the global /account page so a
	// user can delete their account whether or not they're currently in a campaign. Deletion is
	// blocked while they arbiter a campaign (would orphan its admin); the parent supplies that list.
	let { arbiterCampaigns }: { arbiterCampaigns: { id: string; name: string }[] } = $props();

	const arbiterNames = $derived(arbiterCampaigns.map((c) => c.name).join(', '));
	let confirming = $state(false);
	let deleting = $state(false);
	let sent = $state(false);
	let errorMsg = $state<string | null>(null);

	async function requestDeletion() {
		deleting = true;
		errorMsg = null;
		// Better Auth emails a confirmation link (the real gate); the link completes the deletion.
		const { error } = await deleteUser({ callbackURL: '/' });
		deleting = false;
		if (error) {
			errorMsg = error.message ?? 'Could not start account deletion. Try again.';
			return;
		}
		sent = true;
		confirming = false;
	}

	const panel =
		"relative bg-panel border border-border px-[22px] pt-5 pb-[22px] before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-[linear-gradient(90deg,var(--color-accent),transparent_70%)] before:opacity-70 before:content-['']";
	const sec =
		"flex items-center gap-2.5 font-display font-semibold text-[10px] tracking-[0.14em] uppercase text-ink-dim mb-4 after:content-[''] after:flex-1 after:h-px after:bg-border";
	const fieldError = 'font-body text-[12px] text-state-attacker';
	const danger =
		'inline-flex items-center justify-center border border-state-attacker-line bg-state-attacker-soft px-3.5 py-2.5 font-display text-[11px] font-semibold tracking-[0.09em] text-state-attacker uppercase cursor-pointer transition-colors duration-[120ms] hover:border-state-attacker focus-visible:outline-none focus-visible:border-state-attacker disabled:opacity-60 disabled:cursor-not-allowed';
</script>

<section class={panel}>
	<h2 class={sec}>// Danger Zone</h2>
	{#if arbiterCampaigns.length > 0}
		<p class="font-body text-[13px] leading-[1.55] text-ink-dim">
			You command the arbiter's seat in <strong class="text-ink">{arbiterNames}</strong>. Hand off
			the arbiter role or delete
			{arbiterCampaigns.length === 1 ? 'it' : 'them'} before you can delete your account — otherwise the
			campaign would be left with no arbiter.
		</p>
	{:else if sent}
		<p class="font-body text-[13px] leading-[1.55] text-accent">
			Check your inbox — we've sent a confirmation link. Follow it to finish deleting your account.
		</p>
	{:else}
		<p class="mb-4 max-w-[64ch] font-body text-[13px] leading-[1.55] text-ink-dim">
			Permanently delete your account. Your warbands and battle history stay on record under
			<strong class="text-ink">Deleted Commander</strong> so campaign standings hold; your memberships
			and login are removed. This can't be undone.
		</p>
		{#if confirming}
			<div class="flex flex-wrap items-center gap-3">
				<button type="button" class={danger} onclick={requestDeletion} disabled={deleting}>
					{deleting ? 'Sending…' : 'Yes, email me the deletion link'}
				</button>
				<Button type="button" onclick={() => (confirming = false)} disabled={deleting}>Cancel</Button>
			</div>
		{:else}
			<button type="button" class={danger} onclick={() => (confirming = true)}>Delete account</button>
		{/if}
		{#if errorMsg}<p class="{fieldError} mt-3">{errorMsg}</p>{/if}
	{/if}
</section>
