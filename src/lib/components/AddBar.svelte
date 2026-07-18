<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { fieldClass, inputBase } from './ui';

	let addUrl = $state('');
	let showAdvanced = $state(false);

	// Reset + collapse on success; metadata fills in via the page's polling effect.
	const enhanceAdd: SubmitFunction = () => {
		return async ({ update, result }) => {
			await update({ reset: result.type === 'success' });
			if (result.type === 'success') {
				addUrl = '';
				showAdvanced = false;
			}
		};
	};
</script>

<form method="POST" action="?/add" use:enhance={enhanceAdd} class="mx-auto max-w-5xl">
	<div class="flex items-center gap-3">
		<h1 class="text-lg font-semibold tracking-tight whitespace-nowrap">🔖 Bookmarks</h1>
		<input
			name="url"
			bind:value={addUrl}
			type="text"
			placeholder="Paste a URL and press Add…"
			class="flex-1 {inputBase}"
		/>
		<button
			type="button"
			onclick={() => (showAdvanced = !showAdvanced)}
			aria-expanded={showAdvanced}
			class="rounded-md border border-neutral-700 px-2.5 py-1.5 text-sm text-neutral-400 hover:bg-neutral-800"
			title="More fields">{showAdvanced ? 'Less −' : 'More +'}</button
		>
		<button
			class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
			type="submit">Add</button
		>
	</div>

	{#if showAdvanced}
		<div class="mt-2 grid grid-cols-2 gap-2">
			<input name="title" placeholder="Title (optional)" class="col-span-2 {fieldClass}" />
			<input name="tags" placeholder="Tags (comma separated)" class={fieldClass} />
			<input
				name="collection"
				placeholder="Collection (e.g. Dev/Frameworks)"
				list="collection-list"
				class={fieldClass}
			/>
			<textarea name="notes" rows="2" placeholder="Notes" class="col-span-2 {fieldClass}"
			></textarea>
		</div>
	{/if}
</form>
