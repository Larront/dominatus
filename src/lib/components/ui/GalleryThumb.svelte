<script lang="ts">
	// A single painted-models thumbnail that links into the gallery, filtered to its warband. Shared
	// by the chronicle's painting-award event and the stat block's painted-models strip (issue #14)
	// so both stay in sync. The image is served through the membership-gated award-image route.
	let {
		slug,
		imagePath,
		warbandId,
		warbandName,
		note = null
	}: {
		slug: string;
		imagePath: string;
		warbandId: string;
		warbandName: string;
		note?: string | null;
	} = $props();
</script>

<a
	href="/campaigns/{slug}/gallery?warband={warbandId}"
	title="{warbandName} — {note ?? 'painting award'}"
	aria-label="View {warbandName}'s painted models in the gallery"
>
	<img
		src="/campaigns/{slug}/award/image/{imagePath}"
		alt="Painted models — {warbandName}{note ? `, ${note}` : ''}"
		loading="lazy"
		class="size-14 border border-border object-cover transition-colors hover:border-accent-mid"
	/>
</a>
