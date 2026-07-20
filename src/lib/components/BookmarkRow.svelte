<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Bookmark } from '$lib/types';
	import { hostname } from '$lib/url';
	import { iconButton } from './ui';
	import BookmarkTags from './BookmarkTags.svelte';

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
	 * The checkbox shares the icon's slot instead of taking a column of its own.
	 * Rows are read far more often than they are selected, so a checkbox on every
	 * row is clutter most of the time — but it has to stay one movement away, and
	 * reachable by keyboard.
	 */
	const pinned = $derived(selected || selecting);
</script>

<li class="group flex items-center gap-3 py-2 {selected ? 'bg-accent/10' : ''}">
	<div class="relative size-4 shrink-0">
		<span class="block transition-opacity {pinned ? 'opacity-0' : 'group-hover:opacity-0'}">
			{#if pending}
				<span
					class="block size-4 animate-pulse rounded-sm bg-accent-hover/50"
					title="Fetching metadata…"
				></span>
			{:else if bookmark.favicon}
				<img
					src={bookmark.favicon}
					alt=""
					class="size-4 rounded-sm"
					onerror={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
				/>
			{:else}
				<span class="block size-4 rounded-sm bg-muted-surface"></span>
			{/if}
		</span>

		<!-- `focus-visible` keeps it reachable by keyboard even while invisible. -->
		<input
			type="checkbox"
			checked={selected}
			onchange={() => ontoggleSelect(bookmark.url)}
			class="absolute inset-0 size-4 cursor-pointer rounded border-line text-accent transition-opacity focus:ring-focus
				{pinned ? '' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'}"
			aria-label="Select {bookmark.title}"
		/>
	</div>

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
			Collection lives on the secondary line with the notes, not beside the title.
			A nested path like `foo/bar/baz` is long, and it was squeezing the title
			down to a few characters — the one field that must stay readable.
		-->
		<p class="flex min-w-0 items-baseline gap-1.5 text-xs text-faint">
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
	</div>

	<BookmarkTags tags={bookmark.tags} ontoggle={ontoggleTag} />

	<div class="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
		<button
			onclick={() => onedit(bookmark)}
			class="{iconButton} w-auto px-1.5 hover:text-content"
			title="Edit">Edit</button
		>
		<form method="POST" action="?/refresh" use:enhance class="contents">
			<input type="hidden" name="url" value={bookmark.url} />
			<button class="{iconButton} hover:text-content" title="Re-fetch metadata">↻</button>
		</form>
		<form method="POST" action="?/delete" use:enhance class="contents">
			<input type="hidden" name="url" value={bookmark.url} />
			<button class="{iconButton} hover:text-danger" title="Delete">✕</button>
		</form>
	</div>
</li>
