<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Bookmark } from '$lib/types';
	import { field, ghostButton, primaryButton } from './ui';
	import Dialog from './Dialog.svelte';

	let { bookmark, onclose }: { bookmark: Bookmark; onclose: () => void } = $props();
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
		<label class="block text-sm">
			<span class="text-muted">Notes</span>
			<textarea name="notes" rows="3" class="mt-1 {field}">{bookmark.notes ?? ''}</textarea>
		</label>

		{#if bookmark.description}
			<div class="text-sm">
				<span class="text-muted">Description (auto-fetched)</span>
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
