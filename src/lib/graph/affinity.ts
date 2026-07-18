import { type GraphEdge, type GraphNode, collectionPath, isCollectionId } from './types';

/**
 * With bookmarks hidden, tags and collections would sit as unrelated islands — hiding
 * the overlap that is the whole reason to have tags alongside folders. An affinity
 * edge summarizes that hidden overlap: these two hubs hold many of the same bookmarks.
 */

/** An affinity edge needs at least this many shared bookmarks to mean anything. */
const MIN_SHARED = 2;
/** …and they must be this much of the smaller hub, so a broad tag ties to everything. */
const MIN_RATIO = 1 / 3;

/**
 * Relate hubs whose bookmarks are hidden. Only collapsed hubs take part: once a hub
 * is open its real memberships are drawn, and the summary would be clutter.
 *
 * Collection-to-collection pairs are skipped — nesting already relates those, and a
 * parent always contains its children, so every such pair would score perfectly.
 */
export function affinityEdges(
	hubs: GraphNode[],
	membership: ReadonlyMap<string, Set<string>>,
	revealedHubs: ReadonlySet<string>
): GraphEdge[] {
	const collapsed = hubs.filter((hub) => !revealedHubs.has(hub.id));
	const edges: GraphEdge[] = [];

	for (let i = 0; i < collapsed.length; i++) {
		for (let j = i + 1; j < collapsed.length; j++) {
			const edge = relate(collapsed[i], collapsed[j], membership);
			if (edge) edges.push(edge);
		}
	}

	return withoutRedundantAncestors(edges);
}

/** The affinity edge between two hubs, or nothing if their overlap is too thin. */
function relate(
	left: GraphNode,
	right: GraphNode,
	membership: ReadonlyMap<string, Set<string>>
): GraphEdge | undefined {
	if (left.kind === 'collection' && right.kind === 'collection') return undefined;

	const leftMembers = membership.get(left.id);
	const rightMembers = membership.get(right.id);
	if (!leftMembers || !rightMembers) return undefined;

	const shared = intersectionSize(leftMembers, rightMembers);
	if (shared < MIN_SHARED) return undefined;

	const strength = shared / Math.min(leftMembers.size, rightMembers.size);
	if (strength < MIN_RATIO) return undefined;

	return {
		id: `${left.id}=${right.id}`,
		source: left.id,
		target: right.id,
		kind: 'affinity',
		strength,
		shared
	};
}

function intersectionSize(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
	const [smaller, larger] = left.size <= right.size ? [left, right] : [right, left];
	let count = 0;
	for (const value of smaller) if (larger.has(value)) count++;
	return count;
}

/** The two ends of an affinity edge, split into its collection end (if any) and the other. */
function ends(edge: GraphEdge): { partner: string; collection: string | undefined } {
	if (isCollectionId(edge.source)) return { partner: edge.target, collection: edge.source };
	if (isCollectionId(edge.target)) return { partner: edge.source, collection: edge.target };
	return { partner: edge.source, collection: undefined }; // tag-to-tag
}

/**
 * A tag sitting in `Dev/Frameworks` necessarily also sits in `Dev`, so relating it to
 * both states the same fact twice and doubles the lines on screen. Keep the most
 * specific claim; the ancestor edge survives only when no descendant qualified.
 */
function withoutRedundantAncestors(edges: GraphEdge[]): GraphEdge[] {
	const collectionsByPartner = new Map<string, string[]>();
	for (const edge of edges) {
		const { partner, collection } = ends(edge);
		if (!collection) continue;
		const paths = collectionsByPartner.get(partner);
		if (paths) paths.push(collection);
		else collectionsByPartner.set(partner, [collection]);
	}

	return edges.filter((edge) => {
		const { partner, collection } = ends(edge);
		if (!collection) return true;

		const path = collectionPath(collection);
		const alsoRelatedToDescendant = (collectionsByPartner.get(partner) ?? []).some(
			(other) => other !== collection && collectionPath(other).startsWith(`${path}/`)
		);
		return !alsoRelatedToDescendant;
	});
}
