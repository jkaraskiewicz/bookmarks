<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { Bookmark } from '$lib/types';
	import type { PageData, ActionData } from './$types';
	import { buildCollectionTree, flattenCollectionTree } from '$lib/collections';
	import { filterBookmarks, allTags } from '$lib/filter';
	import AddBar from '$lib/components/AddBar.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import BookmarkList from '$lib/components/BookmarkList.svelte';
	import SelectionToolbar from '$lib/components/SelectionToolbar.svelte';
	import EditDialog from '$lib/components/EditDialog.svelte';
	import ViewToggle from '$lib/components/ViewToggle.svelte';
	import { secondaryButton } from '$lib/components/ui';
	import { hiddenSelectedCount, pruneSelection, toggleAll, toggleOne } from '$lib/selection';
	import ThemeToggle from '$lib/theme/ThemeToggle.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let search = $state('');
	let activeTags = $state<string[]>([]);
	let activeCollection = $state('');
	let editing = $state<Bookmark | null>(null);
	/** URLs ticked for a bulk action. Survives filtering; see $lib/selection. */
	let selected = $state<ReadonlySet<string>>(new Set());

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

	const visibleUrls = $derived(filtered.map((bookmark) => bookmark.url));
	const selectedUrls = $derived([...selected]);
	const hiddenSelected = $derived(hiddenSelectedCount(visibleUrls, selected));

	// Deleting, or an edit that changes a URL, can strand keys in the selection.
	$effect(() => {
		const alive = data.bookmarks.map((bookmark) => bookmark.url);
		const pruned = pruneSelection(selected, alive);
		if (pruned.size !== selected.size) selected = pruned;
	});

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

{#snippet selectionActions()}
	<SelectionToolbar
		selected={selectedUrls}
		hiddenCount={hiddenSelected}
		onclear={() => (selected = new Set())}
		ondone={() => (selected = new Set())}
	/>
{/snippet}

<svelte:head><title>Bookmarks</title></svelte:head>

<!-- Autocomplete source shared by the add + edit collection inputs. -->
<datalist id="collection-list">
	{#each collectionPaths as path (path)}<option value={path}></option>{/each}
</datalist>

<div class="min-h-screen bg-canvas text-content">
	<header class="border-b border-subtle bg-surface px-6 py-4">
		<div class="mx-auto flex max-w-5xl items-start gap-4">
			<div class="min-w-0 flex-1"><AddBar /></div>
			<ViewToggle />
			<a href="/import" class="shrink-0 {secondaryButton}" title="Import & export bookmarks"
				>Import</a
			>
			<ThemeToggle />
		</div>
		{#if errorMessage}
			<p class="mx-auto mt-2 max-w-5xl text-sm text-warning">{errorMessage}</p>
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
			{selected}
			ontoggleTag={toggleTag}
			onedit={(bookmark) => (editing = bookmark)}
			ontoggleSelect={(url) => (selected = toggleOne(url, selected))}
			ontoggleAll={() => (selected = toggleAll(visibleUrls, selected))}
			actions={selectedUrls.length > 0 ? selectionActions : undefined}
		/>
	</div>
</div>

{#if editing}
	<EditDialog bookmark={editing} onclose={() => (editing = null)} />
{/if}
