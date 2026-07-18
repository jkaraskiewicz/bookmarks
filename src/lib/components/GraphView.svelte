<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { SvelteFlow, Background, Controls, type Node, type Edge } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import type { Bookmark } from '$lib/types';
	import { buildGraph } from '$lib/graph';
	import { layoutGraph, type Point } from '$lib/graphLayout';
	import BookmarkNode from './nodes/BookmarkNode.svelte';
	import HubNode from './nodes/HubNode.svelte';
	import GraphLegend from './GraphLegend.svelte';

	let { bookmarks, search = '' }: { bookmarks: Bookmark[]; search?: string } = $props();

	const nodeTypes = { bookmark: BookmarkNode, tag: HubNode, collection: HubNode };

	/** Hubs the user has opened. Everything starts collapsed: the map is the overview. */
	let expanded = $state(new SvelteSet<string>());
	/** Where the user dragged things; these positions survive every relayout. */
	let pinned = new Map<string, Point>();
	/** Last computed positions, so opening a hub grows the map instead of reshuffling it. */
	let positions = new Map<string, Point>();

	let nodes = $state.raw<Node[]>([]);
	let edges = $state.raw<Edge[]>([]);

	// Re-render whenever the bookmarks, the open hubs, or the search change.
	$effect(() => {
		const graph = buildGraph(bookmarks, { expanded, search });
		positions = layoutGraph(graph, { previous: positions, pinned });

		nodes = graph.nodes.map((node) => ({
			id: node.id,
			type: node.kind,
			position: positions.get(node.id) ?? { x: 0, y: 0 },
			data: { ...node }
		}));
		edges = graph.edges.map((edge) => ({
			id: edge.id,
			source: edge.source,
			target: edge.target,
			// Affinity edges summarize hidden overlap, so they read as a hint rather
			// than a fact: dashed, and fainter the weaker the overlap.
			animated: false,
			style:
				edge.kind === 'affinity'
					? `stroke-dasharray: 4 4; opacity: ${(0.18 + (edge.strength ?? 0) * 0.42).toFixed(2)}; stroke-width: ${(0.8 + (edge.strength ?? 0) * 1.6).toFixed(2)}`
					: 'opacity: 0.55',
			label: edge.kind === 'affinity' && (edge.shared ?? 0) >= 3 ? String(edge.shared) : undefined
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
		positions.set(targetNode.id, { ...targetNode.position });
	}

	function collapseAll() {
		expanded = new SvelteSet<string>();
		pinned = new Map();
		positions = new Map();
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
