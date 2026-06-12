<script lang="ts">
	import AccessGate from '$lib/components/AccessGate.svelte';
</script>

<div class="relative min-h-[100dvh] overflow-hidden bg-void">
	<!-- Atmosphere: a faint phosphor bloom at the crown and an edge vignette, nothing louder. -->
	<div aria-hidden="true" class="pointer-events-none absolute inset-0">
		<div
			class="absolute top-0 left-1/2 h-[440px] w-[860px] max-w-[150vw] -translate-x-1/2 -translate-y-[38%] rounded-full bg-[radial-gradient(ellipse_at_center,var(--color-accent-soft),transparent_70%)] opacity-70 blur-[42px]"
		></div>
		<div class="absolute inset-0 shadow-[inset_0_0_240px_70px_rgba(0,0,0,0.85)]"></div>
	</div>

	<div class="relative">
		<AccessGate />
	</div>
</div>
