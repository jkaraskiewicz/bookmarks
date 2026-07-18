import type { GraphEdge } from './types';

/**
 * How an edge reads on the canvas. Affinity edges summarize overlap you cannot
 * currently see, so they are drawn as a hint — dashed, and fainter and thinner the
 * weaker the overlap — while membership and parent edges state a fact plainly.
 */

const SOLID_OPACITY = 0.55;

/** Affinity edges fade between these bounds as their overlap goes from none to total. */
const AFFINITY_OPACITY = { min: 0.18, max: 0.6 };
const AFFINITY_WIDTH = { min: 0.8, max: 2.4 };

/** Below this many shared bookmarks the number is noise rather than information. */
const LABEL_FROM_SHARED = 3;

const between = ({ min, max }: { min: number; max: number }, ratio: number) =>
	(min + (max - min) * ratio).toFixed(2);

/** Inline SVG style for an edge. */
export function edgeStyle(edge: GraphEdge): string {
	if (edge.kind !== 'affinity') return `opacity: ${SOLID_OPACITY}`;

	const strength = edge.strength ?? 0;
	return [
		'stroke-dasharray: 4 4',
		`opacity: ${between(AFFINITY_OPACITY, strength)}`,
		`stroke-width: ${between(AFFINITY_WIDTH, strength)}`
	].join('; ');
}

/** The count to show on an affinity edge, once it is big enough to be worth reading. */
export function edgeLabel(edge: GraphEdge): string | undefined {
	if (edge.kind !== 'affinity') return undefined;
	return (edge.shared ?? 0) >= LABEL_FROM_SHARED ? String(edge.shared) : undefined;
}
