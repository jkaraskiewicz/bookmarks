export type GraphNodeKind = 'bookmark' | 'tag' | 'collection';

/**
 * `membership` — a bookmark belongs to a hub.
 * `parent` — a collection sits inside another collection.
 * `affinity` — two collapsed hubs share enough bookmarks to be worth relating; a
 * summary of connections you cannot see because the bookmarks are hidden.
 */
export type GraphEdgeKind = 'membership' | 'parent' | 'affinity';

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
	kind: GraphEdgeKind;
	/** Affinity only: 0–1, how much of the smaller hub the two share. */
	strength?: number;
	/** Affinity only: how many bookmarks the two hubs have in common. */
	shared?: number;
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

/**
 * Node ids namespace the three kinds so one id space can hold them all. Construction
 * and inspection live together here — nothing elsewhere should take an id apart.
 */
const BOOKMARK_PREFIX = 'b:';
const TAG_PREFIX = 't:';
const COLLECTION_PREFIX = 'c:';

export const bookmarkId = (url: string) => `${BOOKMARK_PREFIX}${url}`;
export const tagId = (tag: string) => `${TAG_PREFIX}${tag}`;
export const collectionId = (path: string) => `${COLLECTION_PREFIX}${path}`;

export const isCollectionId = (id: string) => id.startsWith(COLLECTION_PREFIX);

/** The collection path an id refers to. Empty for ids of any other kind. */
export const collectionPath = (id: string) =>
	isCollectionId(id) ? id.slice(COLLECTION_PREFIX.length) : '';

/** Bookmarks with no collection are grouped here rather than scattered loose. */
export const UNFILED = 'Unfiled';

/** `a/b/c` → `a`, `a/b`, `a/b/c`. */
export function pathAndAncestors(path: string): string[] {
	const segments = path.split('/').filter(Boolean);
	return segments.map((_, index) => segments.slice(0, index + 1).join('/'));
}

/** The collection a bookmark sits in, falling back to the unfiled group. */
export const collectionOf = (collection: string | undefined) => collection?.trim() || UNFILED;
