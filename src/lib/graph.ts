import type { Bookmark } from './types';

export type GraphNodeKind = 'bookmark' | 'tag' | 'collection';

export interface GraphNode {
	id: string;
	kind: GraphNodeKind;
	label: string;
	/** Bookmarks in this hub (including nested collections). Hubs only. */
	count?: number;
	/** Whether this hub is showing its bookmarks. Hubs only. */
	expanded?: boolean;
	/** Bookmark-only extras. */
	url?: string;
	favicon?: string;
}

export interface GraphEdge {
	id: string;
	source: string;
	target: string;
}

export interface Graph {
	nodes: GraphNode[];
	edges: GraphEdge[];
}

export interface GraphOptions {
	/** Hubs holding fewer bookmarks than this are not worth drawing. */
	minShared?: number;
	/** Ids of hubs currently showing their bookmarks. */
	expanded?: ReadonlySet<string>;
	/** Free-text filter; matching bookmarks appear regardless of expansion. */
	search?: string;
}

export const bookmarkId = (url: string) => `b:${url}`;
export const tagId = (tag: string) => `t:${tag}`;
export const collectionId = (path: string) => `c:${path}`;

/** Bookmarks with no collection are grouped here rather than scattered loose. */
const UNFILED = 'Unfiled';

/**
 * Build the graph as a set of hubs — collections and tags — that hold bookmarks.
 *
 * Hubs are the primary objects: at a few hundred bookmarks, drawing every bookmark
 * at once is a wall of labels rather than a map. A hub shows its bookmarks only when
 * expanded, or when a search matches them. Collection hubs nest, so `Dev/Frameworks`
 * hangs off `Dev` instead of standing alone.
 */
export function buildGraph(bookmarks: Bookmark[], options: GraphOptions = {}): Graph {
	const { minShared = 2, expanded = new Set<string>(), search = '' } = options;

	const query = search.trim().toLowerCase();
	const matches = (bookmark: Bookmark) => !query || matchesQuery(bookmark, query);

	const collections = collectionHubs(bookmarks, minShared);
	const tags = tagHubs(bookmarks, minShared);
	const hubs = [...collections.nodes, ...tags.nodes];
	const hubIds = new Set(hubs.map((hub) => hub.id));

	const nodes: GraphNode[] = [];
	const edges: GraphEdge[] = [...collections.edges]; // hub → parent hub

	// A bookmark is drawn when its hub is open, or when it matches an active search.
	for (const bookmark of bookmarks) {
		const memberships = hubsHolding(bookmark).filter((id) => hubIds.has(id));
		const revealed = memberships.some((id) => expanded.has(id)) || (query && matches(bookmark));
		if (!revealed) continue;

		nodes.push({
			id: bookmarkId(bookmark.url),
			kind: 'bookmark',
			label: bookmark.title,
			url: bookmark.url,
			favicon: bookmark.favicon
		});

		for (const hubIdentifier of memberships) {
			edges.push({
				id: `${hubIdentifier}~${bookmarkId(bookmark.url)}`,
				source: bookmarkId(bookmark.url),
				target: hubIdentifier
			});
		}
	}

	// Hubs last so they paint above the bookmarks they hold.
	for (const hub of hubs) {
		nodes.push({ ...hub, expanded: expanded.has(hub.id) });
	}

	return { nodes, edges };
}

/** The hub ids a bookmark belongs to: its exact collection, plus each of its tags. */
function hubsHolding(bookmark: Bookmark): string[] {
	const collection = collectionId(bookmark.collection?.trim() || UNFILED);
	return [collection, ...bookmark.tags.map(tagId)];
}

function matchesQuery(bookmark: Bookmark, query: string): boolean {
	const haystack = [bookmark.title, bookmark.url, bookmark.collection, ...bookmark.tags];
	return haystack.some((field) => field?.toLowerCase().includes(query));
}

/**
 * Collection hubs, nested. Every ancestor of a used path becomes a hub too, so
 * `Dev/Frameworks` hangs off `Dev`. A hub's count includes everything beneath it.
 */
function collectionHubs(
	bookmarks: Bookmark[],
	minShared: number
): { nodes: GraphNode[]; edges: GraphEdge[] } {
	const directCounts = new Map<string, number>();
	for (const bookmark of bookmarks) {
		const path = bookmark.collection?.trim() || UNFILED;
		directCounts.set(path, (directCounts.get(path) ?? 0) + 1);
	}

	// Roll each count up through the path's ancestors.
	const totals = new Map<string, number>();
	for (const [path, count] of directCounts) {
		for (const ancestor of pathAndAncestors(path)) {
			totals.set(ancestor, (totals.get(ancestor) ?? 0) + count);
		}
	}

	const nodes: GraphNode[] = [];
	const edges: GraphEdge[] = [];

	for (const [path, count] of totals) {
		if (count < minShared) continue;
		const segments = path.split('/');
		nodes.push({
			id: collectionId(path),
			kind: 'collection',
			label: segments[segments.length - 1],
			count
		});

		const parent = segments.slice(0, -1).join('/');
		if (parent && (totals.get(parent) ?? 0) >= minShared) {
			edges.push({
				id: `${collectionId(parent)}>${collectionId(path)}`,
				source: collectionId(path),
				target: collectionId(parent)
			});
		}
	}

	return { nodes, edges };
}

/** `a/b/c` → `a`, `a/b`, `a/b/c`. */
function pathAndAncestors(path: string): string[] {
	const segments = path.split('/').filter(Boolean);
	return segments.map((_, index) => segments.slice(0, index + 1).join('/'));
}

/** Tag hubs. Flat — tags have no hierarchy, which is what makes them cut across. */
function tagHubs(bookmarks: Bookmark[], minShared: number): { nodes: GraphNode[] } {
	const counts = new Map<string, number>();
	for (const bookmark of bookmarks) {
		for (const tag of bookmark.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
	}

	const nodes: GraphNode[] = [];
	for (const [tag, count] of counts) {
		if (count < minShared) continue;
		nodes.push({ id: tagId(tag), kind: 'tag', label: `#${tag}`, count });
	}

	return { nodes };
}
