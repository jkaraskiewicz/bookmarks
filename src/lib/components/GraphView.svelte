<script lang="ts">
	import { untrack } from 'svelte';
	import { SvelteFlow, Background, Controls, type Node, type Edge } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import type { Bookmark } from '$lib/types';
	import { buildGraph } from '$lib/graph';
	import { layoutGraph } from '$lib/graphLayout';
	import BookmarkNode from './nodes/BookmarkNode.svelte';
	import TagNode from './nodes/TagNode.svelte';
	import CollectionNode from './nodes/CollectionNode.svelte';

	let { bookmarks }: { bookmarks: Bookmark[] } = $props();

	const nodeTypes = { bookmark: BookmarkNode, tag: TagNode, collection: CollectionNode };

	function build(list: Bookmark[]): { nodes: Node[]; edges: Edge[] } {
		const graph = buildGraph(list);
		const positions = layoutGraph(graph);
		const nodes: Node[] = graph.nodes.map((n) => ({
			id: n.id,
			type: n.kind,
			position: positions.get(n.id) ?? { x: 0, y: 0 },
			data: { label: n.label, url: n.url, favicon: n.favicon, degree: n.degree }
		}));
		const edges: Edge[] = graph.edges.map((e) => ({
			id: e.id,
			source: e.source,
			target: e.target
		}));
		return { nodes, edges };
	}

	// The graph is a one-time snapshot of the loaded bookmarks (fresh per navigation).
	const initial = untrack(() => build(bookmarks));
	let nodes = $state.raw<Node[]>(initial.nodes);
	let edges = $state.raw<Edge[]>(initial.edges);
</script>

<div class="h-full w-full">
	<SvelteFlow
		bind:nodes
		bind:edges
		{nodeTypes}
		fitView
		colorMode="dark"
		nodesDraggable={false}
		nodesConnectable={false}
		elementsSelectable={false}
		proOptions={{ hideAttribution: true }}
	>
		<Background />
		<Controls />
	</SvelteFlow>
</div>
