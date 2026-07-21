<script lang="ts">
	import type { TreeNode } from '$lib/collections';
	import { field } from './ui';
	import CollectionTree from './CollectionTree.svelte';
	import TagFilter from './TagFilter.svelte';

	let {
		search = $bindable(),
		collectionTree,
		activeCollection,
		onselectCollection,
		tags,
		activeTags,
		ontoggleTag
	}: {
		search: string;
		collectionTree: TreeNode[];
		activeCollection: string;
		onselectCollection: (path: string) => void;
		tags: string[];
		activeTags: string[];
		ontoggleTag: (tag: string) => void;
	} = $props();
</script>

<aside class="w-56 shrink-0 space-y-5">
	<input bind:value={search} type="search" placeholder="Search…" class={field} />

	{#if collectionTree.length}
		<div>
			<h2 class="mb-1.5 text-xs font-semibold tracking-wide text-faint uppercase">Collections</h2>
			<div class="space-y-0.5 text-sm">
				<button
					class="block w-full rounded px-2 py-0.5 text-left hover:bg-elevated {activeCollection ===
					''
						? 'text-accent-content'
						: 'text-secondary'}"
					onclick={() => onselectCollection('')}>All</button
				>
				<CollectionTree
					nodes={collectionTree}
					selected={activeCollection}
					onselect={onselectCollection}
				/>
			</div>
		</div>
	{/if}

	<TagFilter {tags} active={activeTags} ontoggle={ontoggleTag} />
</aside>
