<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { ghostButton, secondaryButton } from './ui';

	/**
	 * Actions for the current selection. Rendered inside the list's header row rather
	 * than as a bar of its own, so starting a selection swaps that row's contents
	 * instead of pushing the whole list down.
	 *
	 * Only operations that make sense on many bookmarks at once appear here — editing
	 * a title or a URL is inherently singular, so there is no bulk edit.
	 */
	let {
		selected,
		hiddenCount,
		onclear,
		ondone
	}: {
		selected: string[];
		/** How many selected bookmarks the current filter is hiding. */
		hiddenCount: number;
		onclear: () => void;
		ondone: () => void;
	} = $props();

	/** Deleting is irreversible, so it takes a second click that says how many. */
	let confirmingDelete = $state(false);

	// Any change of selection invalidates a pending confirmation.
	$effect(() => {
		selected.length;
		confirmingDelete = false;
	});

	const afterAction: SubmitFunction = () => {
		return async ({ update }) => {
			await update();
			confirmingDelete = false;
			ondone();
		};
	};

	const count = $derived(selected.length);
	const noun = $derived(count === 1 ? 'bookmark' : 'bookmarks');

	const compactButton = 'px-2 py-1 text-xs';
</script>

<span class="shrink-0 text-content">{count} selected</span>
{#if hiddenCount > 0}
	<!-- Say so plainly: the filter hides them, but an action still reaches them. -->
	<span class="hidden shrink-0 sm:inline">({hiddenCount} hidden by the filter)</span>
{/if}

<div class="flex-1"></div>

<form method="POST" action="?/refreshSelected" use:enhance={afterAction} class="contents">
	{#each selected as url (url)}<input type="hidden" name="url" value={url} />{/each}
	<button
		type="submit"
		class="{secondaryButton} {compactButton}"
		title="Re-fetch title, description and icon">↻ Refresh</button
	>
</form>

{#if confirmingDelete}
	<form method="POST" action="?/deleteSelected" use:enhance={afterAction} class="contents">
		{#each selected as url (url)}<input type="hidden" name="url" value={url} />{/each}
		<button type="submit" class="rounded-md bg-danger px-2 py-1 text-xs font-medium text-on-accent"
			>Delete {count} {noun}</button
		>
	</form>
	<button
		type="button"
		onclick={() => (confirmingDelete = false)}
		class="{ghostButton} {compactButton}">Cancel</button
	>
{:else}
	<button
		type="button"
		onclick={() => (confirmingDelete = true)}
		class="{secondaryButton} {compactButton} text-danger">Delete…</button
	>
{/if}

<button type="button" onclick={onclear} class="{ghostButton} {compactButton}">Clear</button>
