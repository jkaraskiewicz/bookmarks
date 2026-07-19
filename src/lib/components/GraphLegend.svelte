<script lang="ts">
	/** Explains what the node colors mean, and offers a way back to the overview. */
	let { openCount, oncollapseAll }: { openCount: number; oncollapseAll: () => void } = $props();
</script>

<div
	class="pointer-events-none absolute top-3 right-3 z-10 flex flex-col items-end gap-2 text-xs text-muted"
>
	<div class="rounded-md border border-subtle bg-surface px-3 py-2 backdrop-blur">
		<p class="flex items-center gap-1.5">
			<span class="inline-block size-2.5 rounded-full bg-collection"></span> collection
		</p>
		<p class="mt-1 flex items-center gap-1.5">
			<span class="inline-block size-2.5 rounded-full bg-tag"></span> tag
		</p>
		<p class="mt-1.5 border-t border-subtle pt-1.5 text-faint">Click a circle to open it</p>
	</div>

	{#if openCount > 0}
		<button
			type="button"
			onclick={oncollapseAll}
			class="pointer-events-auto rounded-md border border-line bg-surface px-2.5 py-1 text-secondary backdrop-blur hover:bg-elevated"
		>
			Collapse all ({openCount})
		</button>
	{/if}
</div>
