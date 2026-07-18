import type { Bookmark } from '$lib/types';
import {
	type GraphEdge,
	type GraphNode,
	collectionId,
	collectionOf,
	pathAndAncestors,
	tagId
} from './types';

/**
 * Hubs are the groupings a bookmark can belong to: the collection it sits in, and
 * each tag it carries. They are the primary objects on the map — bookmarks hang off
 * them rather than the other way round.
 */

/** The hub ids a bookmark belongs to: its exact collection, plus each of its tags. */
export function hubsHolding(bookmark: Bookmark): string[] {
	return [collectionId(collectionOf(bookmark.collection)), ...bookmark.tags.map(tagId)];
}

/**
 * Which bookmarks sit in each hub. Collections include everything nested beneath
 * them, matching how their counts are reported.
 */
export function bookmarksByHub(bookmarks: Bookmark[]): Map<string, Set<string>> {
	const members = new Map<string, Set<string>>();
	const add = (hub: string, url: string) => {
		const urls = members.get(hub);
		if (urls) urls.add(url);
		else members.set(hub, new Set([url]));
	};

	for (const bookmark of bookmarks) {
		for (const path of pathAndAncestors(collectionOf(bookmark.collection))) {
			add(collectionId(path), bookmark.url);
		}
		for (const tag of bookmark.tags) add(tagId(tag), bookmark.url);
	}

	return members;
}

/**
 * Collection hubs, nested. Every ancestor of a used path becomes a hub too, so
 * `Dev/Frameworks` hangs off `Dev`. A hub's count includes everything beneath it.
 */
export function collectionHubs(
	bookmarks: Bookmark[],
	minShared: number
): { nodes: GraphNode[]; edges: GraphEdge[] } {
	const nestedCounts = countsIncludingNested(bookmarks);
	const isDrawn = (path: string) => (nestedCounts.get(path) ?? 0) >= minShared;

	const nodes: GraphNode[] = [];
	const edges: GraphEdge[] = [];

	for (const [path, count] of nestedCounts) {
		if (!isDrawn(path)) continue;
		const segments = path.split('/');

		nodes.push({
			id: collectionId(path),
			kind: 'collection',
			label: segments[segments.length - 1],
			count
		});

		const parent = segments.slice(0, -1).join('/');
		if (parent && isDrawn(parent)) {
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

/** How many bookmarks each collection path holds, counting nested ones. */
function countsIncludingNested(bookmarks: Bookmark[]): Map<string, number> {
	const totals = new Map<string, number>();

	for (const bookmark of bookmarks) {
		for (const path of pathAndAncestors(collectionOf(bookmark.collection))) {
			totals.set(path, (totals.get(path) ?? 0) + 1);
		}
	}

	return totals;
}

/** Tag hubs. Flat — tags have no hierarchy, which is what makes them cut across. */
export function tagHubs(bookmarks: Bookmark[], minShared: number): GraphNode[] {
	const counts = new Map<string, number>();
	for (const bookmark of bookmarks) {
		for (const tag of bookmark.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
	}

	return [...counts]
		.filter(([, count]) => count >= minShared)
		.map(([tag, count]) => ({ id: tagId(tag), kind: 'tag' as const, label: `#${tag}`, count }));
}
