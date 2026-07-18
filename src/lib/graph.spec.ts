import { describe, it, expect } from 'vitest';
import { buildGraph, collectionId, tagId, bookmarkId } from './graph';
import type { Graph } from './graph';
import type { Bookmark } from './types';

function bookmark(url: string, extra: Partial<Bookmark> = {}): Bookmark {
	return { url, title: url, tags: [], added: '2026-01-01T00:00:00.000Z', ...extra };
}

const library = [
	bookmark('https://a.dev', { collection: 'Dev/Frameworks', tags: ['docs'] }),
	bookmark('https://b.dev', { collection: 'Dev/Frameworks', tags: ['docs'] }),
	bookmark('https://c.dev', { collection: 'Dev/Tools' }),
	bookmark('https://d.dev', { collection: 'Dev/Tools' }),
	bookmark('https://e.dev', { collection: 'News' }),
	bookmark('https://f.dev')
];

const ids = (graph: { nodes: { id: string }[] }) => graph.nodes.map((node) => node.id);

describe('buildGraph — overview (nothing expanded)', () => {
	const graph = buildGraph(library);

	it('shows only hubs, so a large library stays readable', () => {
		expect(graph.nodes.every((node) => node.kind !== 'bookmark')).toBe(true);
	});

	it('creates a hub per collection, plus the ancestors they hang from', () => {
		expect(ids(graph)).toContain(collectionId('Dev'));
		expect(ids(graph)).toContain(collectionId('Dev/Frameworks'));
		expect(ids(graph)).toContain(collectionId('Dev/Tools'));
	});

	it('labels a nested hub with its own segment, not the whole path', () => {
		const nested = graph.nodes.find((node) => node.id === collectionId('Dev/Frameworks'));
		expect(nested?.label).toBe('Frameworks');
	});

	it('counts a parent hub as everything beneath it', () => {
		const parent = graph.nodes.find((node) => node.id === collectionId('Dev'));
		expect(parent?.count).toBe(4); // Frameworks 2 + Tools 2
	});

	it('links a child collection to its parent', () => {
		expect(graph.edges).toContainEqual({
			id: `${collectionId('Dev')}>${collectionId('Dev/Frameworks')}`,
			source: collectionId('Dev/Frameworks'),
			target: collectionId('Dev'),
			kind: 'parent'
		});
	});

	it('groups bookmarks with no collection under one hub once there are enough', () => {
		// A single unfiled bookmark is below the threshold, so no hub for it.
		expect(ids(graph)).not.toContain(collectionId('Unfiled'));

		const withUnfiled = buildGraph([...library, bookmark('https://g.dev')]);
		expect(ids(withUnfiled)).toContain(collectionId('Unfiled'));
	});

	it('drops hubs holding fewer than minShared bookmarks', () => {
		expect(ids(graph)).not.toContain(collectionId('News')); // only 1 bookmark
		expect(ids(buildGraph(library, { minShared: 1 }))).toContain(collectionId('News'));
	});

	it('creates tag hubs for shared tags', () => {
		expect(ids(graph)).toContain(tagId('docs'));
		expect(graph.nodes.find((node) => node.id === tagId('docs'))?.count).toBe(2);
	});
});

describe('buildGraph — expanding a hub', () => {
	const expanded = new Set([collectionId('Dev/Frameworks')]);
	const graph = buildGraph(library, { expanded });

	it('reveals just that hub’s bookmarks', () => {
		expect(ids(graph)).toContain(bookmarkId('https://a.dev'));
		expect(ids(graph)).toContain(bookmarkId('https://b.dev'));
		expect(ids(graph)).not.toContain(bookmarkId('https://c.dev')); // lives in Dev/Tools
	});

	it('marks the hub as expanded so the UI can show it open', () => {
		const hub = graph.nodes.find((node) => node.id === collectionId('Dev/Frameworks'));
		expect(hub?.expanded).toBe(true);
	});

	it('connects a revealed bookmark to every hub holding it', () => {
		const targets = graph.edges
			.filter((edge) => edge.source === bookmarkId('https://a.dev'))
			.map((edge) => edge.target);
		expect(targets).toContain(collectionId('Dev/Frameworks'));
		expect(targets).toContain(tagId('docs'));
	});

	it('keeps other hubs collapsed', () => {
		const other = graph.nodes.find((node) => node.id === collectionId('Dev/Tools'));
		expect(other?.expanded).toBe(false);
	});
});

describe('buildGraph — search', () => {
	it('reveals matching bookmarks without expanding anything', () => {
		const graph = buildGraph(library, { search: 'c.dev' });
		expect(ids(graph)).toContain(bookmarkId('https://c.dev'));
		expect(ids(graph)).not.toContain(bookmarkId('https://a.dev'));
	});

	it('matches on collection and tag as well as url', () => {
		expect(ids(buildGraph(library, { search: 'Frameworks' }))).toContain(
			bookmarkId('https://a.dev')
		);
		expect(ids(buildGraph(library, { search: 'docs' }))).toContain(bookmarkId('https://b.dev'));
	});

	it('shows no bookmarks when the query matches nothing', () => {
		const graph = buildGraph(library, { search: 'nothing-matches-this' });
		expect(graph.nodes.every((node) => node.kind !== 'bookmark')).toBe(true);
	});
});

describe('buildGraph — edge cases', () => {
	it('handles an empty library', () => {
		expect(buildGraph([])).toEqual({ nodes: [], edges: [] });
	});

	it('does not emit a bookmark twice when several of its hubs are open', () => {
		const expanded = new Set([collectionId('Dev/Frameworks'), tagId('docs')]);
		const graph = buildGraph(library, { expanded });
		const appearances = ids(graph).filter((id) => id === bookmarkId('https://a.dev'));
		expect(appearances).toHaveLength(1);
	});
});

describe('buildGraph — affinity edges between collapsed hubs', () => {
	const affinity = (graph: Graph) => graph.edges.filter((edge) => edge.kind === 'affinity');

	it('relates a tag to the collection its bookmarks live in', () => {
		const graph = buildGraph(library);
		const edge = affinity(graph).find(
			(candidate) =>
				[candidate.source, candidate.target].includes(tagId('docs')) &&
				[candidate.source, candidate.target].includes(collectionId('Dev/Frameworks'))
		);
		// Both #docs bookmarks are in Dev/Frameworks.
		expect(edge?.shared).toBe(2);
		expect(edge?.strength).toBe(1);
	});

	it('never relates two collections — nesting already does that', () => {
		const collectionPairs = affinity(buildGraph(library)).filter(
			(edge) => edge.source.startsWith('c:') && edge.target.startsWith('c:')
		);
		expect(collectionPairs).toEqual([]);
	});

	it('ignores an overlap of a single bookmark', () => {
		const sparse = [
			bookmark('https://1.dev', { collection: 'A', tags: ['x'] }),
			bookmark('https://2.dev', { collection: 'A' }),
			bookmark('https://3.dev', { collection: 'B', tags: ['x'] }),
			bookmark('https://4.dev', { collection: 'B' })
		];
		// #x has one bookmark in each collection: too thin to claim a relationship.
		expect(affinity(buildGraph(sparse))).toEqual([]);
	});

	it('relates a tag wholly contained in one collection', () => {
		// Every #niche bookmark lives in Big: a real relationship, however small the tag.
		const contained = [
			bookmark('https://n1.dev', { collection: 'Big', tags: ['niche'] }),
			bookmark('https://n2.dev', { collection: 'Big', tags: ['niche'] }),
			...Array.from({ length: 10 }, (_, index) =>
				bookmark(`https://filler${index}.dev`, { collection: 'Big' })
			)
		];
		const edge = affinity(buildGraph(contained)).find(
			(candidate) => candidate.source === tagId('niche') || candidate.target === tagId('niche')
		);
		expect(edge?.strength).toBe(1); // 2 of 2 — the whole tag
	});

	it('ignores a broad tag that barely touches a collection', () => {
		// #broad spans many collections; only 2 of its 12 bookmarks are in Big, and Big
		// holds 12 of its own — 2/12 either way, well under the ratio.
		const lopsided = [
			...Array.from({ length: 2 }, (_, index) =>
				bookmark(`https://in${index}.dev`, { collection: 'Big', tags: ['broad'] })
			),
			...Array.from({ length: 10 }, (_, index) =>
				bookmark(`https://out${index}.dev`, { collection: `Other${index}`, tags: ['broad'] })
			),
			...Array.from({ length: 10 }, (_, index) =>
				bookmark(`https://filler${index}.dev`, { collection: 'Big' })
			)
		];
		const edge = affinity(buildGraph(lopsided)).find(
			(candidate) =>
				[candidate.source, candidate.target].includes(tagId('broad')) &&
				[candidate.source, candidate.target].includes(collectionId('Big'))
		);
		expect(edge).toBeUndefined();
	});

	it('drops the summary edge once a hub is expanded and shows its real links', () => {
		const collapsed = affinity(buildGraph(library)).length;
		expect(collapsed).toBeGreaterThan(0);

		const opened = buildGraph(library, { expanded: new Set([tagId('docs')]) });
		const stillSummarized = affinity(opened).some(
			(edge) => edge.source === tagId('docs') || edge.target === tagId('docs')
		);
		expect(stillSummarized).toBe(false);
	});

	it('keeps summary edges between hubs that are still collapsed', () => {
		const opened = buildGraph(library, { expanded: new Set([collectionId('News')]) });
		expect(affinity(opened).length).toBeGreaterThan(0);
	});
});

describe('buildGraph — affinity edges prefer the most specific collection', () => {
	it('relates a tag to the nested collection, not also to its parent', () => {
		const graph = buildGraph(library);
		const partners = graph.edges
			.filter((edge) => edge.kind === 'affinity')
			.filter((edge) => [edge.source, edge.target].includes(tagId('docs')))
			.map((edge) => (edge.source === tagId('docs') ? edge.target : edge.source));

		// #docs lives entirely in Dev/Frameworks, which is inside Dev. Saying both
		// would draw the same fact twice.
		expect(partners).toContain(collectionId('Dev/Frameworks'));
		expect(partners).not.toContain(collectionId('Dev'));
	});

	it('still relates a tag to a parent when nothing nested qualifies', () => {
		// Spread across two children so neither child clears the ratio, but the parent does.
		const spread = [
			bookmark('https://p1.dev', { collection: 'Top/One', tags: ['wide'] }),
			bookmark('https://p2.dev', { collection: 'Top/Two', tags: ['wide'] }),
			bookmark('https://p3.dev', { collection: 'Top/One' }),
			bookmark('https://p4.dev', { collection: 'Top/Two' })
		];
		const partners = buildGraph(spread)
			.edges.filter((edge) => edge.kind === 'affinity')
			.filter((edge) => [edge.source, edge.target].includes(tagId('wide')))
			.map((edge) => (edge.source === tagId('wide') ? edge.target : edge.source));

		expect(partners).toContain(collectionId('Top'));
	});
});
