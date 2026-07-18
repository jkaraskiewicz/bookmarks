import type { Bookmark } from './types';

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

export const bookmarkId = (url: string) => `b:${url}`;
export const tagId = (tag: string) => `t:${tag}`;
export const collectionId = (path: string) => `c:${path}`;

/** Bookmarks with no collection are grouped here rather than scattered loose. */
const UNFILED = 'Unfiled';

/** An affinity edge needs at least this many shared bookmarks to mean anything. */
const MIN_AFFINITY_SHARED = 2;
/** …and they must be at least this much of the smaller hub, so big hubs don't tie to everything. */
const MIN_AFFINITY_RATIO = 1 / 3;

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
	const membership = hubMembership(bookmarks);
	const collections = collectionHubs(bookmarks, minShared);
	const tags = tagHubs(bookmarks, minShared);
	const hubs = [...collections.nodes, ...tags.nodes];
	const hubIds = new Set(hubs.map((hub) => hub.id));

	const nodes: GraphNode[] = [];
	const edges: GraphEdge[] = [...collections.edges];

	// A bookmark is drawn when its hub is open, or when it matches an active search.
	const revealedHubs = new Set<string>();
	for (const bookmark of bookmarks) {
		const holders = hubsHolding(bookmark).filter((id) => hubIds.has(id));
		const revealed =
			holders.some((id) => expanded.has(id)) || (query !== '' && matchesQuery(bookmark, query));
		if (!revealed) continue;

		nodes.push({
			id: bookmarkId(bookmark.url),
			kind: 'bookmark',
			label: bookmark.title,
			url: bookmark.url,
			favicon: bookmark.favicon
		});

		for (const holder of holders) {
			revealedHubs.add(holder);
			edges.push({
				id: `${holder}~${bookmarkId(bookmark.url)}`,
				source: bookmarkId(bookmark.url),
				target: holder,
				kind: 'membership'
			});
		}
	}

	// Relate hubs whose bookmarks are hidden — otherwise a collapsed map shows tags and
	// collections as unrelated islands, hiding the very overlap that makes tags useful.
	edges.push(...affinityEdges(hubs, membership, revealedHubs));

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
 * Which bookmarks sit in each hub. Collections include everything nested beneath
 * them, matching how their counts are reported.
 */
function hubMembership(bookmarks: Bookmark[]): Map<string, Set<string>> {
	const members = new Map<string, Set<string>>();
	const add = (hub: string, url: string) => {
		const set = members.get(hub);
		if (set) set.add(url);
		else members.set(hub, new Set([url]));
	};

	for (const bookmark of bookmarks) {
		for (const path of pathAndAncestors(bookmark.collection?.trim() || UNFILED)) {
			add(collectionId(path), bookmark.url);
		}
		for (const tag of bookmark.tags) add(tagId(tag), bookmark.url);
	}

	return members;
}

/**
 * Faint edges between hubs that overlap: `#testing` next to `Dev/Tools`, or two tags
 * that travel together. Only drawn between hubs that are both collapsed — once a hub
 * is open its real memberships are visible, and the summary would just be clutter.
 *
 * Collection-to-collection pairs are skipped: nesting already relates those, and a
 * parent always contains its children, so every such pair would score perfectly.
 */
function affinityEdges(
	hubs: GraphNode[],
	membership: Map<string, Set<string>>,
	revealedHubs: ReadonlySet<string>
): GraphEdge[] {
	const candidates = hubs.filter((hub) => !revealedHubs.has(hub.id));
	const edges: GraphEdge[] = [];

	for (let i = 0; i < candidates.length; i++) {
		for (let j = i + 1; j < candidates.length; j++) {
			const [left, right] = [candidates[i], candidates[j]];
			if (left.kind === 'collection' && right.kind === 'collection') continue;

			const leftMembers = membership.get(left.id);
			const rightMembers = membership.get(right.id);
			if (!leftMembers || !rightMembers) continue;

			const shared = intersectionSize(leftMembers, rightMembers);
			if (shared < MIN_AFFINITY_SHARED) continue;

			const strength = shared / Math.min(leftMembers.size, rightMembers.size);
			if (strength < MIN_AFFINITY_RATIO) continue;

			edges.push({
				id: `${left.id}=${right.id}`,
				source: left.id,
				target: right.id,
				kind: 'affinity',
				strength,
				shared
			});
		}
	}

	return keepMostSpecific(edges);
}

/**
 * A tag that sits in `Dev/Frameworks` necessarily also sits in `Dev`, so relating it
 * to both says the same thing twice and doubles the lines on screen. Keep the most
 * specific claim and drop the ancestor.
 */
function keepMostSpecific(edges: GraphEdge[]): GraphEdge[] {
	const collectionsByPartner = new Map<string, string[]>();
	for (const edge of edges) {
		const [hub, collection] = edge.source.startsWith('c:')
			? [edge.target, edge.source]
			: [edge.source, edge.target];
		if (!collection.startsWith('c:')) continue; // tag-to-tag: nothing to generalize
		const paths = collectionsByPartner.get(hub);
		if (paths) paths.push(collection);
		else collectionsByPartner.set(hub, [collection]);
	}

	const isAncestorOfAnother = (hub: string, collection: string) => {
		const path = collection.slice(2);
		return (collectionsByPartner.get(hub) ?? []).some(
			(other) => other !== collection && other.slice(2).startsWith(`${path}/`)
		);
	};

	return edges.filter((edge) => {
		const [hub, collection] = edge.source.startsWith('c:')
			? [edge.target, edge.source]
			: [edge.source, edge.target];
		if (!collection.startsWith('c:')) return true;
		return !isAncestorOfAnother(hub, collection);
	});
}

function intersectionSize(left: Set<string>, right: Set<string>): number {
	const [small, large] = left.size <= right.size ? [left, right] : [right, left];
	let count = 0;
	for (const value of small) if (large.has(value)) count++;
	return count;
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
				target: collectionId(parent),
				kind: 'parent'
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
