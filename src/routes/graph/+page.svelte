<script lang="ts">
	import type { PageData } from './$types';
	import GraphView from '$lib/components/GraphView.svelte';
	import ViewToggle from '$lib/components/ViewToggle.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Bookmarks · Graph</title></svelte:head>

<div class="flex h-dvh flex-col bg-neutral-900 text-neutral-100">
	<header class="flex items-center gap-4 border-b border-neutral-800 bg-neutral-950/60 px-6 py-4">
		<h1 class="text-lg font-semibold tracking-tight whitespace-nowrap">🔖 Bookmarks</h1>
		<div class="flex-1"></div>
		<ViewToggle />
	</header>

	<div class="min-h-0 flex-1">
		{#if data.bookmarks.length}
			<GraphView bookmarks={data.bookmarks} />
		{:else}
			<p class="p-6 text-sm text-neutral-500">
				No bookmarks yet. Add some in the list view to see them here.
			</p>
		{/if}
	</div>
</div>
