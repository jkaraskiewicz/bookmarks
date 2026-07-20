<script lang="ts">
	import type { PageData } from './$types';
	import GraphView from '$lib/components/GraphView.svelte';
	import ViewToggle from '$lib/components/ViewToggle.svelte';
	import { inputBase } from '$lib/components/ui';
	import ThemePicker from '$lib/theme/ThemePicker.svelte';

	let { data }: { data: PageData } = $props();

	/** Matching bookmarks surface without needing their hub opened. */
	let search = $state('');
</script>

<svelte:head><title>Bookmarks · Graph</title></svelte:head>

<div class="flex h-dvh flex-col bg-canvas text-content">
	<header class="flex items-center gap-4 border-b border-subtle bg-surface px-6 py-4">
		<h1 class="text-lg font-semibold tracking-tight whitespace-nowrap">🔖 Bookmarks</h1>
		<input
			bind:value={search}
			type="search"
			placeholder="Find a bookmark…"
			class="w-64 {inputBase}"
		/>
		<div class="flex-1"></div>
		<ViewToggle />
		<ThemePicker />
	</header>

	<div class="min-h-0 flex-1">
		{#if data.bookmarks.length}
			<GraphView bookmarks={data.bookmarks} {search} />
		{:else}
			<p class="p-6 text-sm text-faint">
				No bookmarks yet. Add some in the list view to see them here.
			</p>
		{/if}
	</div>
</div>
