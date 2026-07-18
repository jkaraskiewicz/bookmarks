<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { Bookmark } from '$lib/types';
	import type { PageData, ActionData } from './$types';
	import { buildCollectionTree, flattenCollectionTree } from '$lib/collections';
	import { filterBookmarks, allTags } from '$lib/filter';
	import AddBar from '$lib/components/AddBar.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import BookmarkList from '$lib/components/BookmarkList.svelte';
	import EditDialog from '$lib/components/EditDialog.svelte';
	import ViewToggle from '$lib/components/ViewToggle.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let search = $state('');
	let activeTags = $state<string[]>([]);
	let activeCollection = $state('');
	let editing = $state<Bookmark | null>(null);

	const tags = $derived(allTags(data.bookmarks));
	const collectionTree = $derived(buildCollectionTree(data.bookmarks));
	const collectionPaths = $derived(flattenCollectionTree(collectionTree));
	const filtered = $derived(
		filterBookmarks(data.bookmarks, { search, tags: activeTags, collection: activeCollection })
	);
	const pendingSet = $derived(new Set(data.pending));
	// Error text surfaced by a failed add/update/delete/refresh action. Duplicate
	// failures are excluded — the add bar shows those inline, with actions attached.
	const errorMessage = $derived(
		form && 'message' in form && !('existing' in form) ? form.message : null
	);

	// While anything is being enriched, re-run the load to pick up results, then stop.
	$effect(() => {
		if (data.pending.length === 0) return;
		const id = setTimeout(() => invalidateAll(), 1000);
		return () => clearTimeout(id);
	});

	function toggleTag(tag: string) {
		activeTags = activeTags.includes(tag)
			? activeTags.filter((t) => t !== tag)
			: [...activeTags, tag];
	}
</script>

<svelte:head><title>Bookmarks</title></svelte:head>

<!-- Autocomplete source shared by the add + edit collection inputs. -->
<datalist id="collection-list">
	{#each collectionPaths as path (path)}<option value={path}></option>{/each}
</datalist>

<div class="min-h-screen bg-neutral-900 text-neutral-100">
	<header class="border-b border-neutral-800 bg-neutral-950/60 px-6 py-4">
		<div class="mx-auto flex max-w-5xl items-start gap-4">
			<div class="min-w-0 flex-1"><AddBar /></div>
			<ViewToggle />
			<a
				href="/import"
				class="shrink-0 rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
				title="Import & export bookmarks">Import</a
			>
		</div>
		{#if errorMessage}
			<p class="mx-auto mt-2 max-w-5xl text-sm text-amber-400">{errorMessage}</p>
		{/if}
	</header>

	<div class="mx-auto flex max-w-5xl gap-6 px-6 py-6">
		<Sidebar
			bind:search
			{collectionTree}
			{activeCollection}
			onselectCollection={(path) => (activeCollection = path)}
			{tags}
			{activeTags}
			ontoggleTag={toggleTag}
		/>
		<BookmarkList
			bookmarks={filtered}
			total={data.bookmarks.length}
			{pendingSet}
			ontoggleTag={toggleTag}
			onedit={(bookmark) => (editing = bookmark)}
		/>
	</div>
</div>

{#if editing}
	<EditDialog bookmark={editing} onclose={() => (editing = null)} />
{/if}
