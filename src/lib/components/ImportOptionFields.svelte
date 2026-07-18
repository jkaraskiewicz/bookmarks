<script lang="ts">
	import { fieldClass } from './ui';

	// Options shared by every import source, so each form posts the same field names.
	let open = $state(false);
</script>

<div>
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-expanded={open}
		class="text-sm text-neutral-400 hover:text-neutral-100"
		>{open ? 'Options −' : 'Options +'}</button
	>

	{#if open}
		<div class="mt-2 grid grid-cols-2 gap-2">
			<label class="block text-sm">
				<span class="text-neutral-400">Put under collection</span>
				<input
					name="collectionPrefix"
					placeholder="e.g. Imported"
					list="collection-list"
					class="mt-1 {fieldClass}"
				/>
			</label>
			<label class="block text-sm">
				<span class="text-neutral-400">Tag everything with</span>
				<input name="extraTags" placeholder="chrome, to-read" class="mt-1 {fieldClass}" />
			</label>
		</div>
	{/if}
</div>
