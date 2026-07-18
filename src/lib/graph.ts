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
	// Group bookmark ids by each tag and collection.
	const tagMembers = new Map<string, string[]>();
	const collectionMembers = new Map<string, string[]>();
	const add = (map: Map<string, string[]>, key: string, id: string) => {
		(map.get(key) ?? map.set(key, []).get(key)!).push(id);
	};

	for (const b of bookmarks) {
		const id = bookmarkId(b.url);
		for (const tag of b.tags) add(tagMembers, tag, id);
		if (b.collection) add(collectionMembers, b.collection, id);
	}

	const nodes: GraphNode[] = [];
	const edges: GraphEdge[] = [];
	const degree = new Map<string, number>();
	const bump = (id: string) => degree.set(id, (degree.get(id) ?? 0) + 1);

	// Hub nodes + edges, only for attributes shared by >= minShared bookmarks.
	const addHub = (
		members: Map<string, string[]>,
		kind: 'tag' | 'collection',
		makeId: (key: string) => string,
		label: (key: string) => string
	) => {
		for (const [key, ids] of members) {
			if (ids.length < minShared) continue;
			const hubId = makeId(key);
			nodes.push({ id: hubId, kind, label: label(key), degree: ids.length });
			for (const id of ids) {
				edges.push({ id: `${hubId}~${id}`, source: id, target: hubId });
				bump(id);
			}
		}
	};

	addHub(tagMembers, 'tag', tagId, (t) => `#${t}`);
	addHub(collectionMembers, 'collection', collectionId, (c) => c);

	// Bookmark nodes (all of them, connected or not).
	for (const b of bookmarks) {
		const id = bookmarkId(b.url);
		nodes.unshift({
			id,
			kind: 'bookmark',
			label: b.title,
			degree: degree.get(id) ?? 0,
			url: b.url,
			favicon: b.favicon
		});
	}

	return { nodes, edges };
}
