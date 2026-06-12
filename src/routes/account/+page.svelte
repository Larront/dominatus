<script lang="ts">
	import { goto } from '$app/navigation';
	import { signOut } from '$lib/auth-client';
	import Button from '$lib/components/ui/Button.svelte';
	import BrandMark from '$lib/components/BrandMark.svelte';
	import DeleteAccountSection from '$lib/components/DeleteAccountSection.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	async function logout() {
		await signOut();
		await goto('/', { invalidateAll: true });
	}
</script>

<div class="relative min-h-[100dvh] bg-void">
	<header
		class="relative z-10 flex items-center gap-4 border-b border-border bg-[linear-gradient(180deg,var(--color-panel)_0%,transparent_140%)] px-[22px] py-3.5 backdrop-blur-[6px] after:absolute
			after:-bottom-px after:left-0 after:h-px after:w-full after:bg-[linear-gradient(90deg,transparent,var(--color-border-lum)_30%,var(--color-border-lum)_70%,transparent)] after:opacity-60 after:content-[''] max-[680px]:px-4"
	>
		<a class="flex items-center gap-[13px] no-underline" href="/" aria-label="Back to your campaigns">
			<BrandMark
				class="size-9 shrink-0 text-accent drop-shadow-[0_0_6px_var(--color-accent-glow)]"
			/>
			<span
				class="font-display text-[19px] font-bold tracking-[0.03em] text-ink max-[680px]:text-[17px]"
			>
				DOMINATUS
			</span>
		</a>

		<div class="flex-1"></div>

		{#if data.user.name}
			<span class="font-body text-[12px] text-ink-dim max-[520px]:hidden">{data.user.name}</span>
		{/if}
		<Button type="button" variant="ghost" onclick={logout}>Sign out</Button>
	</header>

	<main class="mx-auto max-w-[880px] px-6 pt-9 pb-20 max-[680px]:px-4">
		<header class="mb-7">
			<p
				class="mb-2.5 font-display text-[10px] font-semibold tracking-[0.14em] text-accent uppercase"
			>
				// Account
			</p>
			<h1 class="font-display text-[30px] leading-none font-bold tracking-[0.01em] text-ink">
				Your Account
			</h1>
			<p class="mt-3 max-w-[64ch] font-body text-[13px] leading-[1.55] text-ink-dim">
				Manage your Dominatus account.
				<a href="/" class="text-accent transition-colors duration-150 hover:underline">
					Back to your campaigns
				</a>.
			</p>
		</header>

		<div class="flex flex-col gap-[18px]">
			<DeleteAccountSection arbiterCampaigns={data.arbiterCampaigns} />
		</div>
	</main>
</div>
