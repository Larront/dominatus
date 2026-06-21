<script lang="ts">
	// Build-time app version (from package.json via kit.version.name in svelte.config.js).
	import { version } from '$app/environment';

	let { class: klass = '' }: { class?: string } = $props();
</script>

<span
	class="font-display text-[10px] font-medium tracking-[0.12em] text-ink-faint uppercase tabular-nums {klass}"
>
	Dominatus v{version}
</span>
