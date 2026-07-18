<script lang="ts">
	import type { Bookmark } from '$lib/types';
	import BookmarkRow from './BookmarkRow.svelte';

	let {
		bookmarks,
		total,
		pendingSet,
		ontoggleTag,
		onedit
	}: {
		bookmarks: Bookmark[];
		total: number;
		pendingSet: Set<string>;
		ontoggleTag: (tag: string) => void;
		onedit: (bookmark: Bookmark) => void;
	} = $props();
</script>

<main class="min-w-0 flex-1">
	<p class="mb-3 text-xs text-neutral-500">
		{bookmarks.length} of {total} bookmark{total === 1 ? '' : 's'}
	</p>

	{#if total === 0}
		<p class="text-sm text-neutral-500">
			No bookmarks yet. Paste a URL above to add your first one.
		</p>
	{:else}
		<ul class="divide-y divide-neutral-800">
			{#each bookmarks as bookmark (bookmark.url)}
				<BookmarkRow {bookmark} pending={pendingSet.has(bookmark.url)} {ontoggleTag} {onedit} />
			{/each}
		</ul>
	{/if}
</main>
