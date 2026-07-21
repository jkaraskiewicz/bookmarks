<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Bookmark } from '$lib/types';
	import { fieldClass, ghostButton, primaryButton } from './ui';

	let { bookmark, onclose }: { bookmark: Bookmark; onclose: () => void } = $props();
</script>

<!--
	The backdrop deliberately does not close the dialog. A stray click beside it
	used to discard whatever had been typed, with no warning and no way back —
	closing is worth a deliberate press of Cancel.
-->
<div
	class="fixed inset-0 z-10 flex items-center justify-center bg-overlay p-4"
	role="dialog"
	aria-modal="true"
	aria-labelledby="edit-dialog-title"
>
	<form
		method="POST"
		action="?/update"
		use:enhance={() =>
			async ({ update }) => {
				await update();
				onclose();
			}}
		class="w-full max-w-md space-y-3 rounded-lg border border-line bg-canvas p-5 text-content"
	>
		<h2 id="edit-dialog-title" class="text-base font-semibold">Edit bookmark</h2>
		<input type="hidden" name="originalUrl" value={bookmark.url} />

		<label class="block text-sm">
			<span class="text-muted">Title</span>
			<input name="title" value={bookmark.title} class="mt-1 {fieldClass}" />
		</label>
		<label class="block text-sm">
			<span class="text-muted">URL</span>
			<input name="url" value={bookmark.url} class="mt-1 {fieldClass}" />
		</label>
		<label class="block text-sm">
			<span class="text-muted">Tags (comma separated)</span>
			<input name="tags" value={bookmark.tags.join(', ')} class="mt-1 {fieldClass}" />
		</label>
		<label class="block text-sm">
			<span class="text-muted">Collection</span>
			<input
				name="collection"
				value={bookmark.collection ?? ''}
				list="collection-list"
				class="mt-1 {fieldClass}"
			/>
		</label>
		<label class="block text-sm">
			<span class="text-muted">Notes</span>
			<textarea name="notes" rows="3" class="mt-1 {fieldClass}">{bookmark.notes ?? ''}</textarea>
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
</div>
