import type { Bookmark } from '$lib/types';
import type { Graph } from './types';

/**
 * Shared fixtures for the graph tests. Not imported by application code.
 */

export function bookmark(url: string, extra: Partial<Bookmark> = {}): Bookmark {
	return { url, title: url, tags: [], added: '2026-01-01T00:00:00.000Z', ...extra };
}

/**
 * A small library with nested collections, a tag confined to one collection
 * (`docs`), a collection below the threshold (`News`) and an unfiled bookmark.
 */
export const library: Bookmark[] = [
	bookmark('https://a.dev', { collection: 'Dev/Frameworks', tags: ['docs'] }),
	bookmark('https://b.dev', { collection: 'Dev/Frameworks', tags: ['docs'] }),
	bookmark('https://c.dev', { collection: 'Dev/Tools' }),
	bookmark('https://d.dev', { collection: 'Dev/Tools' }),
	bookmark('https://e.dev', { collection: 'News' }),
	bookmark('https://f.dev')
];

/** Every node id in a graph, for asserting on what a build produced. */
export const nodeIds = (graph: Graph) => graph.nodes.map((node) => node.id);
