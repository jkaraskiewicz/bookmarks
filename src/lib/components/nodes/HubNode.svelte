<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';

	/**
	 * A collection or tag: the primary object in the map. Sized by how many bookmarks
	 * it holds, so the shape of the library is readable before reading any label.
	 * Clicking toggles whether its bookmarks are shown.
	 */
	let { data }: NodeProps = $props();
	const hub = $derived(
		data as { label: string; count: number; expanded: boolean; kind: 'tag' | 'collection' }
	);

	// Size grows with the count but only logarithmically, so one huge folder does not
	// dwarf everything else on the map.
	const SMALLEST = 0.85;
	const LARGEST = 1.9;
	const GROWTH_PER_DECADE = 0.55;

	const scale = $derived(
		Math.min(LARGEST, SMALLEST + Math.log10(Math.max(hub.count, 1)) * GROWTH_PER_DECADE)
	);

	const colours = $derived(
		hub.kind === 'tag'
			? 'bg-tag hover:bg-tag-hover border-tag-edge'
			: 'bg-collection hover:bg-collection-hover border-collection-edge'
	);
</script>

<div
	class="flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 font-medium text-on-accent shadow-lg transition {colours}
		{hub.expanded ? 'ring-2 ring-on-accent/50' : ''}"
	style="font-size: {(scale * 0.8).toFixed(2)}rem"
	title={hub.expanded ? 'Click to collapse' : `Click to show ${hub.count} bookmarks`}
>
	<span aria-hidden="true">{hub.kind === 'tag' ? '#' : '📁'}</span>
	<span>{hub.label}</span>
	<span class="rounded-full bg-black/25 px-1.5 text-[0.7em] tabular-nums">{hub.count}</span>
</div>

<Handle type="target" position={Position.Top} style="opacity:0" isConnectable={false} />
<Handle type="source" position={Position.Bottom} style="opacity:0" isConnectable={false} />
