<script lang="ts">
	import { goto } from '$app/navigation';
	import { signOut } from '$lib/auth-client';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	async function logout() {
		await signOut();
		await goto('/login');
	}
</script>

<main class="mx-auto max-w-2xl p-8">
	<h1 class="font-display text-2xl" style="color: var(--accent)">Commander dossier</h1>
	<p class="mt-2 text-sm" style="color: var(--text-dim)">
		Your role in this campaign: <strong>{data.role}</strong>.
	</p>
	<p class="mt-1 text-sm" style="color: var(--text-dim)">
		Roster, record, and detachments are a follow-up.
	</p>

	<button
		type="button"
		onclick={logout}
		class="mt-6 p-2 font-display text-xs uppercase"
		style="border: 1px solid var(--border); color: var(--text-dim)"
	>
		Sign out
	</button>
</main>
