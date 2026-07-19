<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Bookmark } from '$lib/types';
	import BookmarkRow from './BookmarkRow.svelte';
	import { selectAllState } from '$lib/selection';

	let {
		bookmarks,
		total,
		pendingSet,
		selected,
		ontoggleTag,
		onedit,
		ontoggleSelect,
		ontoggleAll,
		actions
	}: {
		bookmarks: Bookmark[];
		total: number;
		pendingSet: Set<string>;
		selected: ReadonlySet<string>;
		ontoggleTag: (tag: string) => void;
		onedit: (bookmark: Bookmark) => void;
		ontoggleSelect: (url: string) => void;
		ontoggleAll: () => void;
		/** Shown in the header row in place of the count while a selection exists. */
		actions?: Snippet;
	} = $props();

	const visible = $derived(bookmarks.map((bookmark) => bookmark.url));
	const allState = $derived(selectAllState(visible, selected));
</script>

<main class="min-w-0 flex-1">
	<!--
		One header row, always present and always the same height. Selection actions
		replace the count here rather than appearing above the list, so starting a
		selection does not shove every bookmark down the page.
	-->
	<div class="mb-2 flex min-h-9 items-center gap-2 text-xs text-faint">
		{#if total > 0}
			<input
				type="checkbox"
				checked={allState === 'all'}
				indeterminate={allState === 'some'}
				onchange={ontoggleAll}
				disabled={bookmarks.length === 0}
				class="size-4 shrink-0 rounded border-line text-accent focus:ring-focus"
				aria-label={allState === 'all' ? 'Deselect all shown' : 'Select all shown'}
			/>
		{/if}

		{#if actions}
			{@render actions()}
		{:else}
			<span>{bookmarks.length} of {total} bookmark{total === 1 ? '' : 's'}</span>
		{/if}
	</div>

	{#if total === 0}
		<p class="text-sm text-faint">No bookmarks yet. Paste a URL above to add your first one.</p>
	{:else}
		<ul class="divide-y divide-subtle">
			{#each bookmarks as bookmark (bookmark.url)}
				<BookmarkRow
					{bookmark}
					pending={pendingSet.has(bookmark.url)}
					selected={selected.has(bookmark.url)}
					{ontoggleTag}
					{onedit}
					{ontoggleSelect}
				/>
			{/each}
		</ul>
	{/if}
</main>
