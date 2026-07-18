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
}

export interface Point {
	x: number;
	y: number;
}

/**
 * Compute a settled force-directed layout for a graph. Deterministic (d3-force
 * seeds positions in a fixed phyllotaxis pattern), so the same graph lays out the
 * same way each time. Returns a map of node id → position.
 */
export function layoutGraph(graph: Graph): Map<string, Point> {
	const nodes: SimNode[] = graph.nodes.map((n) => ({ id: n.id }));
	const links = graph.edges.map((e) => ({ source: e.source, target: e.target }));

	const simulation = forceSimulation(nodes)
		.force(
			'link',
			forceLink<SimNode, (typeof links)[number]>(links)
				.id((n) => n.id)
				.distance(100)
				.strength(0.4)
		)
		.force('charge', forceManyBody().strength(-320))
		.force('center', forceCenter(0, 0))
		.force('collide', forceCollide(72))
		// Gently pull disconnected clusters toward the middle for a tighter map.
		.force('x', forceX(0).strength(0.06))
		.force('y', forceY(0).strength(0.06))
		.stop();

	// Run to a settled state synchronously (no animation frames).
	simulation.tick(300);

	const positions = new Map<string, Point>();
	for (const node of nodes) {
		positions.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 });
	}
	return positions;
}
