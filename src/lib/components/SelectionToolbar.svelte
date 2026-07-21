<script lang="ts">
	import { ghostButton, secondaryButton } from './ui';
	import UrlAction from './UrlAction.svelte';

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

	function finish() {
		confirmingDelete = false;
		ondone();
	}

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

<UrlAction action="?/refreshSelected" url={selected} onsubmitted={finish}>
	<button
		type="submit"
		class="{secondaryButton} {compactButton}"
		title="Re-fetch title, description and icon">↻ Refresh</button
	>
</UrlAction>

{#if confirmingDelete}
	<UrlAction action="?/deleteSelected" url={selected} onsubmitted={finish}>
		<button type="submit" class="rounded-md bg-danger px-2 py-1 text-xs font-medium text-on-danger"
			>Delete {count} {noun}</button
		>
	</UrlAction>
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
