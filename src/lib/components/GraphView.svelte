<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { SvelteFlow, Background, Controls, type Node, type Edge } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import type { Bookmark } from '$lib/types';
	import { buildGraph } from '$lib/graph';
	import { edgeStyle, edgeLabel } from '$lib/graph/edgeStyle';
	import { layoutGraph, type Point } from '$lib/graph/layout';
	import BookmarkNode from './nodes/BookmarkNode.svelte';
	import HubNode from './nodes/HubNode.svelte';
	import GraphLegend from './GraphLegend.svelte';

	let { bookmarks, search = '' }: { bookmarks: Bookmark[]; search?: string } = $props();

	const nodeTypes = { bookmark: BookmarkNode, tag: HubNode, collection: HubNode };

	/** Hubs the user has opened. Everything starts collapsed: the map is the overview. */
	let expanded = $state(new SvelteSet<string>());
	/** Where the user dragged things; these positions survive every relayout. */
	let pinned = new Map<string, Point>();
	/** Where everything sat last time, so opening a hub grows the map rather than reshuffling it. */
	let lastPositions = new Map<string, Point>();

	let nodes = $state.raw<Node[]>([]);
	let edges = $state.raw<Edge[]>([]);

	// Re-render whenever the bookmarks, the open hubs, or the search change.
	$effect(() => {
		const graph = buildGraph(bookmarks, { expanded, search });
		lastPositions = layoutGraph(graph, { previous: lastPositions, pinned });

		nodes = graph.nodes.map((node) => ({
			id: node.id,
			type: node.kind,
			position: lastPositions.get(node.id) ?? { x: 0, y: 0 },
			data: { ...node }
		}));
		edges = graph.edges.map((edge) => ({
			id: edge.id,
			source: edge.source,
			target: edge.target,
			style: edgeStyle(edge),
			label: edgeLabel(edge)
		}));
	});

	/** Clicking a hub shows or hides the bookmarks it holds. Bookmarks are links. */
	function toggleHub({ node }: { node: Node }) {
		if (node.type === 'bookmark') return;
		if (expanded.has(node.id)) expanded.delete(node.id);
		else expanded.add(node.id);
	}

	/** Remember where a node was dropped, so later relayouts leave it where you put it. */
	function pinNode({ targetNode }: { targetNode: Node | null }) {
		if (!targetNode) return;
		pinned.set(targetNode.id, { ...targetNode.position });
		lastPositions.set(targetNode.id, { ...targetNode.position });
	}

	function collapseAll() {
		expanded = new SvelteSet<string>();
		pinned = new Map();
		lastPositions = new Map();
	}
</script>

<div class="relative h-full w-full">
	<SvelteFlow
		bind:nodes
		bind:edges
		{nodeTypes}
		fitView
		colorMode="dark"
		minZoom={0.1}
		nodesConnectable={false}
		onnodeclick={toggleHub}
		onnodedragstop={pinNode}
		proOptions={{ hideAttribution: true }}
	>
		<Background />
		<Controls />
	</SvelteFlow>

	<GraphLegend openCount={expanded.size} oncollapseAll={collapseAll} />
</div>
