<script lang="ts">
	import type { Bookmark } from '$lib/types';
	import { hostname } from '$lib/url';
	import BookmarkTags from './BookmarkTags.svelte';
	import RowActions from './RowActions.svelte';
	import RowMarker from './RowMarker.svelte';

	let {
		bookmark,
		pending,
		selected,
		selecting,
		ontoggleTag,
		onedit,
		ontoggleSelect
	}: {
		bookmark: Bookmark;
		pending: boolean;
		selected: boolean;
		/** True once anything is selected, so every row shows its checkbox. */
		selecting: boolean;
		ontoggleTag: (tag: string) => void;
		onedit: (bookmark: Bookmark) => void;
		ontoggleSelect: (url: string) => void;
	} = $props();

	/**
	 * Whether the row has a second line at all. A bookmark with nothing but a title
	 * would otherwise reserve an empty one and sit against the top of its row; the
	 * row keeps its height either way (`min-h-15`) and centres what it does have.
	 */
	const hasSubtitle = $derived(
		Boolean(bookmark.collection || bookmark.notes || bookmark.description) ||
			bookmark.tags.length > 0
	);
</script>

<li class="group flex min-h-15 items-center gap-3 py-2 {selected ? 'bg-accent/10' : ''}">
	<RowMarker
		favicon={bookmark.favicon}
		{pending}
		{selected}
		{selecting}
		label={bookmark.title}
		ontoggle={() => ontoggleSelect(bookmark.url)}
	/>

	<div class="min-w-0 flex-1">
		<!--
			The title is the thing being scanned for, so it gets the room. `truncate`
			needs a sized box, hence the flex row rather than inline text; and the
			host is capped so a long domain cannot crowd the title out.
		-->
		<div class="flex min-w-0 items-baseline gap-2">
			<a
				href={bookmark.url}
				target="_blank"
				rel="noreferrer"
				class="min-w-0 truncate font-medium text-content hover:text-accent-content"
				title={bookmark.description || bookmark.url}>{bookmark.title}</a
			>
			<!-- Holds its natural width up to a cap: a host shrunk to "d…" tells you nothing. -->
			<span class="max-w-36 shrink-0 truncate text-xs text-faint">{hostname(bookmark.url)}</span>
			{#if pending}
				<span class="shrink-0 animate-pulse text-xs text-accent-content">fetching…</span>
			{/if}
		</div>

		<!--
			Everything else lives on the secondary line, so the title has the first one
			to itself. Collection, notes and tags each cost the title characters when
			they sit beside it — with six tags it was down to 37 of 84.

			Within this line the order of sacrifice is description, then collection,
			then tags: the description is the first thing you can do without.
		-->
		{#if hasSubtitle}
			<!-- `min-h-5` is the height of a tag chip, so tagged and untagged rows match. -->
			<div class="flex min-h-5 min-w-0 items-baseline gap-3">
				<p class="flex min-w-0 flex-1 items-baseline gap-1.5 text-xs text-faint">
					{#if bookmark.collection}
						<span class="max-w-1/2 shrink-0 truncate" title={bookmark.collection}
							>{bookmark.collection}</span
						>
					{/if}
					{#if bookmark.notes}
						<span class="truncate">{bookmark.notes}</span>
					{:else if bookmark.description}
						<span class="truncate italic">{bookmark.description}</span>
					{/if}
				</p>

				<BookmarkTags tags={bookmark.tags} ontoggle={ontoggleTag} />
			</div>
		{/if}
	</div>

	<RowActions url={bookmark.url} onedit={() => onedit(bookmark)} />
</li>
