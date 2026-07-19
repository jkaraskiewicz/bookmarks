<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Bookmark } from '$lib/types';
	import { hostname } from '$lib/url';
	import { iconButton } from './ui';

	let {
		bookmark,
		pending,
		selected,
		ontoggleTag,
		onedit,
		ontoggleSelect
	}: {
		bookmark: Bookmark;
		pending: boolean;
		selected: boolean;
		ontoggleTag: (tag: string) => void;
		onedit: (bookmark: Bookmark) => void;
		ontoggleSelect: (url: string) => void;
	} = $props();
</script>

<li class="group flex items-center gap-3 py-2 {selected ? 'bg-accent/10' : ''}">
	<input
		type="checkbox"
		checked={selected}
		onchange={() => ontoggleSelect(bookmark.url)}
		class="size-4 shrink-0 rounded border-line text-accent focus:ring-focus"
		aria-label="Select {bookmark.title}"
	/>
	{#if pending}
		<span
			class="size-4 shrink-0 animate-pulse rounded-sm bg-accent-hover/50"
			title="Fetching metadata…"
		></span>
	{:else if bookmark.favicon}
		<img
			src={bookmark.favicon}
			alt=""
			class="size-4 shrink-0 rounded-sm"
			onerror={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
		/>
	{:else}
		<span class="size-4 shrink-0 rounded-sm bg-muted-surface"></span>
	{/if}

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

	<div class="flex max-w-1/3 shrink flex-wrap justify-end gap-1">
		{#each bookmark.tags as tag (tag)}
			<button
				onclick={() => ontoggleTag(tag)}
				class="rounded-full bg-elevated px-1.5 py-0.5 text-xs text-muted hover:bg-muted-surface"
				>#{tag}</button
			>
		{/each}
	</div>

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
