<script lang="ts">
	import { field } from './ui';

	// Options shared by every import source, so each form posts the same field names.
	let open = $state(false);
</script>

<div>
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-expanded={open}
		class="text-sm text-muted hover:text-content">{open ? 'Options −' : 'Options +'}</button
	>

	{#if open}
		<div class="mt-2 grid grid-cols-2 gap-2">
			<label class="block text-sm">
				<span class="text-muted">Put under collection</span>
				<input
					name="collectionPrefix"
					placeholder="e.g. Imported"
					list="collection-list"
					class="mt-1 {field}"
				/>
			</label>
			<label class="block text-sm">
				<span class="text-muted">Tag everything with</span>
				<input name="extraTags" placeholder="chrome, to-read" class="mt-1 {field}" />
			</label>
		</div>
	{/if}
</div>
