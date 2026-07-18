<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Bookmark } from '$lib/types';
	import { hostname } from '$lib/url';
	import { iconButton } from './ui';

	let {
		bookmark,
		pending,
		ontoggleTag,
		onedit
	}: {
		bookmark: Bookmark;
		pending: boolean;
		ontoggleTag: (tag: string) => void;
		onedit: (bookmark: Bookmark) => void;
	} = $props();
</script>

<li class="group flex items-center gap-3 py-2">
	{#if pending}
		<span class="size-4 shrink-0 animate-pulse rounded-sm bg-blue-500/50" title="Fetching metadata…"
		></span>
	{:else if bookmark.favicon}
		<img
			src={bookmark.favicon}
			alt=""
			class="size-4 shrink-0 rounded-sm"
			onerror={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
		/>
	{:else}
		<span class="size-4 shrink-0 rounded-sm bg-neutral-700"></span>
	{/if}

	<div class="min-w-0 flex-1">
		<a
			href={bookmark.url}
			target="_blank"
			rel="noreferrer"
			class="truncate font-medium text-neutral-100 hover:text-blue-400"
			title={bookmark.description || bookmark.url}>{bookmark.title}</a
		>
		<span class="ml-2 text-xs text-neutral-500">{hostname(bookmark.url)}</span>
		{#if bookmark.collection}
			<span class="ml-2 text-xs text-neutral-600">/ {bookmark.collection}</span>
		{/if}
		{#if pending}
			<span class="ml-2 animate-pulse text-xs text-blue-400">fetching…</span>
		{/if}
		{#if bookmark.notes}
			<p class="truncate text-xs text-neutral-500">{bookmark.notes}</p>
		{:else if bookmark.description}
			<p class="truncate text-xs text-neutral-600 italic">{bookmark.description}</p>
		{/if}
	</div>

	<div class="flex shrink-0 flex-wrap gap-1">
		{#each bookmark.tags as tag (tag)}
			<button
				onclick={() => ontoggleTag(tag)}
				class="rounded-full bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-700"
				>#{tag}</button
			>
		{/each}
	</div>

	<div class="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
		<button
			onclick={() => onedit(bookmark)}
			class="{iconButton} w-auto px-1.5 hover:text-neutral-100"
			title="Edit">Edit</button
		>
		<form method="POST" action="?/refresh" use:enhance class="contents">
			<input type="hidden" name="url" value={bookmark.url} />
			<button class="{iconButton} hover:text-neutral-100" title="Re-fetch metadata">↻</button>
		</form>
		<form method="POST" action="?/delete" use:enhance class="contents">
			<input type="hidden" name="url" value={bookmark.url} />
			<button class="{iconButton} hover:text-red-400" title="Delete">✕</button>
		</form>
	</div>
</li>
