import {
	forceSimulation,
	forceLink,
	forceManyBody,
	forceCenter,
	forceCollide,
	forceX,
	forceY,
	type SimulationNodeDatum
} from 'd3-force';
import type { Graph } from './graph';

interface SimNode extends SimulationNodeDatum {
	id: string;
	isHub: boolean;
}

export interface Point {
	x: number;
	y: number;
}

export interface LayoutOptions {
	/** Positions already on screen, so expanding a hub doesn't reshuffle the map. */
	previous?: ReadonlyMap<string, Point>;
	/** Nodes the user has dragged; these stay exactly where they were put. */
	pinned?: ReadonlyMap<string, Point>;
}

/** d3 replaces link endpoints with node objects once the simulation is initialized. */
function isHubEnd(end: string | SimNode): boolean {
	return typeof end !== 'string' && end.isHub;
}

/** Hubs repel harder and claim more room than the bookmarks hanging off them. */
const HUB_CHARGE = -900;
const BOOKMARK_CHARGE = -260;
// Collision radii are half the widest a node gets, so cards can't overlap sideways:
// bookmark cards cap at 190px, hub pills at ~220px when a big count scales them up.
const HUB_RADIUS = 115;
const BOOKMARK_RADIUS = 100;

/**
 * Seeding from previous positions starts a grown graph cramped, so it needs more
 * settling than a fresh one. Scales with size, capped to keep the pause short.
 */
function tickCount(nodeCount: number): number {
	return Math.min(700, 300 + nodeCount);
}

/**
 * Compute a settled force-directed layout. Nodes already on screen keep their
 * positions as a starting point, so opening a hub grows the map outward instead of
 * rearranging it; dragged nodes are fixed and act as anchors for everything else.
 */
export function layoutGraph(graph: Graph, options: LayoutOptions = {}): Map<string, Point> {
	const { previous, pinned } = options;

	const nodes: SimNode[] = graph.nodes.map((node) => {
		const isHub = node.kind !== 'bookmark';
		const anchor = pinned?.get(node.id);
		const start = anchor ?? previous?.get(node.id) ?? seedNear(node.id, graph, previous);
		return {
			id: node.id,
			isHub,
			x: start?.x,
			y: start?.y,
			// A pinned node is immovable: fx/fy override simulation forces.
			fx: anchor?.x,
			fy: anchor?.y
		};
	});

	// Affinity links are the clustering force: the more two hubs overlap, the closer
	// they sit, so related tags and collections end up as neighbours.
	const links = graph.edges.map((edge) => ({
		source: edge.source,
		target: edge.target,
		distance: edge.kind === 'affinity' ? 230 - (edge.strength ?? 0) * 110 : undefined,
		pull: edge.kind === 'affinity' ? 0.15 + (edge.strength ?? 0) * 0.55 : undefined
	}));

	const simulation = forceSimulation(nodes)
		.force(
			'link',
			forceLink<SimNode, (typeof links)[number]>(links)
				.id((node) => node.id)
				.distance((link) => link.distance ?? (isHubEnd(link.source) ? 160 : 110))
				.strength((link) => link.pull ?? 0.5)
		)
		.force(
			'charge',
			forceManyBody<SimNode>().strength((node) => (node.isHub ? HUB_CHARGE : BOOKMARK_CHARGE))
		)
		.force('center', forceCenter(0, 0))
		.force(
			'collide',
			forceCollide<SimNode>().radius((node) => (node.isHub ? HUB_RADIUS : BOOKMARK_RADIUS))
		)
		// Gently pull disconnected clusters toward the middle for a tighter map.
		.force('x', forceX(0).strength(0.05))
		.force('y', forceY(0).strength(0.05))
		.stop();

	// Run to a settled state synchronously (no animation frames).
	simulation.tick(tickCount(nodes.length));

	const positions = new Map<string, Point>();
	for (const node of nodes) {
		positions.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 });
	}
	return positions;
}

/**
 * A newly revealed node starts near whatever it is attached to, rather than at the
 * origin — otherwise expanding a hub flings its bookmarks in from the centre.
 */
function seedNear(
	id: string,
	graph: Graph,
	previous?: ReadonlyMap<string, Point>
): Point | undefined {
	if (!previous?.size) return undefined;

	for (const edge of graph.edges) {
		if (edge.source !== id && edge.target !== id) continue;
		const neighbour = edge.source === id ? edge.target : edge.source;
		const at = previous.get(neighbour);
		// Offset slightly so co-revealed siblings don't start stacked on each other.
		if (at) return { x: at.x + (Math.random() - 0.5) * 60, y: at.y + (Math.random() - 0.5) * 60 };
	}

	return undefined;
}
