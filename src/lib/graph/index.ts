import type { Bookmark } from '$lib/types';
import { type Graph, type GraphEdge, type GraphNode, type GraphOptions, bookmarkId } from './types';
import { bookmarksByHub, collectionHubs, hubsHolding, tagHubs } from './hubs';
import { affinityEdges } from './affinity';

export * from './types';

/**
 * Build the graph as a set of hubs — collections and tags — that hold bookmarks.
 *
 * Hubs are the primary objects: at a few hundred bookmarks, drawing every bookmark at
 * once is a wall of labels rather than a map. A hub shows its bookmarks only when
 * expanded, or when a search matches them. Collection hubs nest, so `Dev/Frameworks`
 * hangs off `Dev` instead of standing alone.
 */
export function buildGraph(bookmarks: Bookmark[], options: GraphOptions = {}): Graph {
	const { minShared = 2, expanded = new Set<string>(), search = '' } = options;

	const collections = collectionHubs(bookmarks, minShared);
	const hubs = [...collections.nodes, ...tagHubs(bookmarks, minShared)];
	const revealed = revealBookmarks(bookmarks, hubs, expanded, search);

	return {
		// Hubs last so they paint above the bookmarks they hold.
		nodes: [...revealed.nodes, ...hubs.map((hub) => ({ ...hub, expanded: expanded.has(hub.id) }))],
		edges: [
			...collections.edges,
			...revealed.edges,
			...affinityEdges(hubs, bookmarksByHub(bookmarks), revealed.hubs)
		]
	};
}

/**
 * The bookmarks currently on show, with an edge to each hub holding them. A bookmark
 * appears when one of its hubs is open, or when a search matches it — search reveals
 * in place, so you can see where in the library a match lives.
 */
function revealBookmarks(
	bookmarks: Bookmark[],
	hubs: GraphNode[],
	expanded: ReadonlySet<string>,
	search: string
): { nodes: GraphNode[]; edges: GraphEdge[]; hubs: Set<string> } {
	const query = search.trim().toLowerCase();
	const drawnHubs = new Set(hubs.map((hub) => hub.id));

	const nodes: GraphNode[] = [];
	const edges: GraphEdge[] = [];
	const revealedHubs = new Set<string>();

	for (const bookmark of bookmarks) {
		const holders = hubsHolding(bookmark).filter((id) => drawnHubs.has(id));
		const isRevealed =
			holders.some((id) => expanded.has(id)) || (query !== '' && matchesQuery(bookmark, query));
		if (!isRevealed) continue;

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

	return { nodes, edges, hubs: revealedHubs };
}

function matchesQuery(bookmark: Bookmark, query: string): boolean {
	const haystack = [bookmark.title, bookmark.url, bookmark.collection, ...bookmark.tags];
	return haystack.some((field) => field?.toLowerCase().includes(query));
}
