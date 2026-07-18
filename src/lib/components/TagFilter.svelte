<script lang="ts">
	let {
		tags,
		active,
		ontoggle
	}: { tags: string[]; active: string[]; ontoggle: (tag: string) => void } = $props();
</script>

{#if tags.length}
	<div>
		<h2 class="mb-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase">Tags</h2>
		<div class="flex flex-wrap gap-1.5">
			{#each tags as tag (tag)}
				<button
					onclick={() => ontoggle(tag)}
					class="rounded-full px-2 py-0.5 text-xs {active.includes(tag)
						? 'bg-blue-600 text-white'
						: 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}">#{tag}</button
				>
			{/each}
		</div>
	</div>
{/if}
