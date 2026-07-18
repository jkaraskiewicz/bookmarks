<script lang="ts">
	import type { TreeNode } from '$lib/collections';
	import CollectionTree from './CollectionTree.svelte';

	let {
		nodes,
		selected,
		onselect,
		depth = 0
	}: {
		nodes: TreeNode[];
		selected: string;
		onselect: (path: string) => void;
		depth?: number;
	} = $props();
</script>

{#each nodes as node (node.path)}
	<button
		style="padding-left: {depth * 14 + 8}px"
		class="flex w-full items-center gap-1.5 rounded py-0.5 pr-2 text-left hover:bg-neutral-800 {selected ===
		node.path
			? 'text-blue-400'
			: 'text-neutral-300'}"
		onclick={() => onselect(node.path)}
	>
		{#if depth > 0}<span class="text-neutral-600">└</span>{/if}
		<span class="truncate">{node.name}</span>
		<span class="ml-auto text-xs text-neutral-600">{node.count}</span>
	</button>
	<CollectionTree nodes={node.children} {selected} {onselect} depth={depth + 1} />
{/each}
