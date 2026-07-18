<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Bookmark } from '$lib/types';
	import { fieldClass, ghostButton, primaryButton } from './ui';

	let { bookmark, onclose }: { bookmark: Bookmark; onclose: () => void } = $props();
</script>

<div
	class="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4"
	onclick={(e) => e.target === e.currentTarget && onclose()}
	role="presentation"
>
	<form
		method="POST"
		action="?/update"
		use:enhance={() =>
			async ({ update }) => {
				await update();
				onclose();
			}}
		class="w-full max-w-md space-y-3 rounded-lg border border-neutral-700 bg-neutral-900 p-5 text-neutral-100"
	>
		<h2 class="text-base font-semibold">Edit bookmark</h2>
		<input type="hidden" name="originalUrl" value={bookmark.url} />

		<label class="block text-sm">
			<span class="text-neutral-400">Title</span>
			<input name="title" value={bookmark.title} class="mt-1 {fieldClass}" />
		</label>
		<label class="block text-sm">
			<span class="text-neutral-400">URL</span>
			<input name="url" value={bookmark.url} class="mt-1 {fieldClass}" />
		</label>
		<label class="block text-sm">
			<span class="text-neutral-400">Tags (comma separated)</span>
			<input name="tags" value={bookmark.tags.join(', ')} class="mt-1 {fieldClass}" />
		</label>
		<label class="block text-sm">
			<span class="text-neutral-400">Collection</span>
			<input
				name="collection"
				value={bookmark.collection ?? ''}
				list="collection-list"
				class="mt-1 {fieldClass}"
			/>
		</label>
		<label class="block text-sm">
			<span class="text-neutral-400">Notes</span>
			<textarea name="notes" rows="3" class="mt-1 {fieldClass}">{bookmark.notes ?? ''}</textarea>
		</label>

		{#if bookmark.description}
			<div class="text-sm">
				<span class="text-neutral-400">Description (auto-fetched)</span>
				<p
					class="mt-1 rounded-md border border-neutral-800 bg-neutral-800/40 px-3 py-1.5 text-sm text-neutral-300"
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
