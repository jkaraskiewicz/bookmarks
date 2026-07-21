<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import type { Bookmark } from '$lib/types';
	import { appendParagraph } from '$lib/notes';
	import { field, ghostButton, primaryButton, secondaryButton } from './ui';
	import Dialog from './Dialog.svelte';

	let { bookmark, onclose }: { bookmark: Bookmark; onclose: () => void } = $props();

	/**
	 * Notes and icon are bound rather than left to the DOM, because two controls write
	 * to them: the field itself, and the button that copies the description across.
	 *
	 * Seeded once and then owned by the user — `untrack` says so. The parent keys this
	 * component on the bookmark, so opening a different one builds a fresh dialog
	 * rather than leaving these holding the previous bookmark's text.
	 */
	let notes = $state(untrack(() => bookmark.notes ?? ''));
	let favicon = $state(untrack(() => bookmark.favicon ?? ''));

	/** Pressing it again would be a no-op, so it stops offering itself. */
	const alreadyCopied = $derived(
		Boolean(bookmark.description) && notes.includes(bookmark.description!.trim())
	);

	/** Empty is a valid answer — it clears the icon and lets a refresh find another. */
	let iconFailed = $state(false);
	$effect(() => {
		favicon;
		iconFailed = false;
	});
</script>

<!--
	Not dismissable: a stray click beside the form used to discard whatever had been
	typed, with no warning and no way back. Closing is worth a deliberate Cancel.
-->
<Dialog title="Edit bookmark" {onclose}>
	<form
		method="POST"
		action="?/update"
		use:enhance={() =>
			async ({ update }) => {
				await update();
				onclose();
			}}
		class="space-y-3"
	>
		<input type="hidden" name="originalUrl" value={bookmark.url} />

		<label class="block text-sm">
			<span class="text-muted">Title</span>
			<input name="title" value={bookmark.title} class="mt-1 {field}" />
		</label>
		<label class="block text-sm">
			<span class="text-muted">URL</span>
			<input name="url" value={bookmark.url} class="mt-1 {field}" />
		</label>
		<label class="block text-sm">
			<span class="text-muted">Tags (comma separated)</span>
			<input name="tags" value={bookmark.tags.join(', ')} class="mt-1 {field}" />
		</label>
		<label class="block text-sm">
			<span class="text-muted">Collection</span>
			<input
				name="collection"
				value={bookmark.collection ?? ''}
				list="collection-list"
				class="mt-1 {field}"
			/>
		</label>

		<!--
			The icon sits beside its own field so a URL can be judged by whether the
			thing appears, rather than by reading it.
		-->
		<label class="block text-sm">
			<span class="text-muted">Icon URL</span>
			<span class="mt-1 flex items-center gap-2">
				<span
					class="flex size-8 shrink-0 items-center justify-center rounded-md border border-subtle bg-elevated"
				>
					{#if favicon.trim() && !iconFailed}
						<img
							src={favicon.trim()}
							alt=""
							class="size-4 rounded-sm"
							onerror={() => (iconFailed = true)}
						/>
					{:else}
						<span class="text-xs text-faint">{iconFailed ? '✕' : '—'}</span>
					{/if}
				</span>
				<input
					name="favicon"
					bind:value={favicon}
					placeholder="https://example.com/favicon.ico"
					class={field}
				/>
			</span>
		</label>
		<p class="text-xs text-faint">
			{#if iconFailed}
				That address did not load an image.
			{:else}
				Set one by hand when the fetch cannot find a good icon; it will not be overwritten. Empty it
				to have the next refresh look again.
			{/if}
		</p>

		<label class="block text-sm">
			<span class="text-muted">Notes</span>
			<textarea name="notes" rows="3" bind:value={notes} class="mt-1 {field}"></textarea>
		</label>

		{#if bookmark.description}
			<div class="text-sm">
				<span class="flex items-baseline justify-between gap-2">
					<span class="text-muted">Description (auto-fetched)</span>
					<button
						type="button"
						onclick={() => (notes = appendParagraph(notes, bookmark.description ?? ''))}
						disabled={alreadyCopied}
						class="{secondaryButton} px-2 py-0.5 text-xs disabled:opacity-40"
						title={alreadyCopied
							? 'Already in your notes'
							: 'Add this to your notes, where you can edit it'}
					>
						{alreadyCopied ? 'Copied' : 'Copy to notes'}
					</button>
				</span>
				<p
					class="mt-1 rounded-md border border-subtle bg-elevated px-3 py-1.5 text-sm text-secondary"
				>
					{bookmark.description}
				</p>
			</div>
		{/if}

		<div class="flex justify-end gap-2 pt-1">
			<button type="button" onclick={onclose} class={ghostButton}>Cancel</button>
			<button class={primaryButton}>Save</button>
		</div>
	</form>
</Dialog>
