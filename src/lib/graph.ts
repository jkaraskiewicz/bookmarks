import type { Bookmark } from './types';

export type GraphNodeKind = 'bookmark' | 'tag' | 'collection';

export interface GraphNode {
	id: string;
	kind: GraphNodeKind;
	label: string;
	/** Number of edges touching this node (bookmarks per hub / hubs per bookmark). */
	degree: number;
	/** Bookmark-only extras. */
	url?: string;
	favicon?: string;
}

export interface GraphEdge {
	id: string;
	source: string; // bookmark node id
	target: string; // tag or collection node id
}

export interface Graph {
	nodes: GraphNode[];
	edges: GraphEdge[];
}

const bookmarkId = (url: string) => `b:${url}`;
const tagId = (tag: string) => `t:${tag}`;
const collectionId = (collection: string) => `c:${collection}`;

/**
 * Build a hub-model graph: bookmarks link to the tags and collections they belong
 * to. Only hubs shared by at least `minShared` bookmarks are kept, so the graph
 * shows real groupings; bookmarks with no shared attribute appear as lone nodes.
 */
export function buildGraph(bookmarks: Bookmark[], minShared = 2): Graph {
	const byTag = bookmarkIdsByAttribute(bookmarks, (bookmark) => bookmark.tags);
	const byCollection = bookmarkIdsByAttribute(bookmarks, (bookmark) =>
		bookmark.collection ? [bookmark.collection] : []
	);

	const tagHubs = buildHubs(byTag, 'tag', tagId, (tag) => `#${tag}`, minShared);
	const collectionHubs = buildHubs(
		byCollection,
		'collection',
		collectionId,
		(path) => path,
		minShared
	);

	const hubs = [...tagHubs, ...collectionHubs];
	const edges = hubs.flatMap((hub) => hub.edges);

	return {
		// Bookmarks first so they render beneath the hubs.
		nodes: [...bookmarkNodes(bookmarks, edges), ...hubs.map((hub) => hub.node)],
		edges
	};
}

/** Index bookmark ids by each attribute value they carry (a tag, or a collection). */
function bookmarkIdsByAttribute(
	bookmarks: Bookmark[],
	attributesOf: (bookmark: Bookmark) => string[]
): Map<string, string[]> {
	const members = new Map<string, string[]>();

	for (const bookmark of bookmarks) {
		for (const attribute of attributesOf(bookmark)) {
			const ids = members.get(attribute);
			if (ids) ids.push(bookmarkId(bookmark.url));
			else members.set(attribute, [bookmarkId(bookmark.url)]);
		}
	}

	return members;
}

/**
 * Turn each sufficiently-shared attribute into a hub node plus its edges. Attributes
 * held by fewer than `minShared` bookmarks are dropped: they describe no grouping.
 */
function buildHubs(
	members: Map<string, string[]>,
	kind: 'tag' | 'collection',
	makeId: (key: string) => string,
	makeLabel: (key: string) => string,
	minShared: number
): { node: GraphNode; edges: GraphEdge[] }[] {
	const hubs: { node: GraphNode; edges: GraphEdge[] }[] = [];

	for (const [key, ids] of members) {
		if (ids.length < minShared) continue;
		const hubId = makeId(key);
		hubs.push({
			node: { id: hubId, kind, label: makeLabel(key), degree: ids.length },
			edges: ids.map((id) => ({ id: `${hubId}~${id}`, source: id, target: hubId }))
		});
	}

	return hubs;
}

/** One node per bookmark, connected or not, with its degree taken from the edges. */
function bookmarkNodes(bookmarks: Bookmark[], edges: GraphEdge[]): GraphNode[] {
	const degree = new Map<string, number>();
	for (const edge of edges) {
		degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
	}

	return bookmarks.map((bookmark) => ({
		id: bookmarkId(bookmark.url),
		kind: 'bookmark' as const,
		label: bookmark.title,
		degree: degree.get(bookmarkId(bookmark.url)) ?? 0,
		url: bookmark.url,
		favicon: bookmark.favicon
	}));
}
