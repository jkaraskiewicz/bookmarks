<script lang="ts">
	import { iconButton } from './ui';
	import UrlAction from './UrlAction.svelte';

	/** The per-row controls, revealed on hover so a resting list stays quiet. */
	let { url, onedit }: { url: string; onedit: () => void } = $props();
</script>

<div class="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
	<button onclick={onedit} class="{iconButton} w-auto px-1.5 hover:text-content" title="Edit"
		>Edit</button
	>
	<UrlAction action="?/refresh" {url}>
		<button class="{iconButton} hover:text-content" title="Re-fetch metadata">↻</button>
	</UrlAction>
	<UrlAction action="?/delete" {url}>
		<button class="{iconButton} hover:text-danger" title="Delete">✕</button>
	</UrlAction>
</div>
