<script lang="ts">
	/** Explains what the node colors mean, and offers a way back to the overview. */
	let { openCount, oncollapseAll }: { openCount: number; oncollapseAll: () => void } = $props();
</script>

<div
	class="pointer-events-none absolute top-3 right-3 z-10 flex flex-col items-end gap-2 text-xs text-neutral-400"
>
	<div class="rounded-md border border-neutral-800 bg-neutral-950/85 px-3 py-2 backdrop-blur">
		<p class="flex items-center gap-1.5">
			<span class="inline-block size-2.5 rounded-full bg-emerald-600"></span> collection
		</p>
		<p class="mt-1 flex items-center gap-1.5">
			<span class="inline-block size-2.5 rounded-full bg-sky-600"></span> tag
		</p>
		<p class="mt-1.5 border-t border-neutral-800 pt-1.5 text-neutral-500">
			Click a circle to open it
		</p>
	</div>

	{#if openCount > 0}
		<button
			type="button"
			onclick={oncollapseAll}
			class="pointer-events-auto rounded-md border border-neutral-700 bg-neutral-900/90 px-2.5 py-1 text-neutral-300 backdrop-blur hover:bg-neutral-800"
		>
			Collapse all ({openCount})
		</button>
	{/if}
</div>
