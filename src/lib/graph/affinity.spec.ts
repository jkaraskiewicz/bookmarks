import { describe, it, expect } from 'vitest';
import { buildGraph, collectionId, tagId, isCollectionId } from './index';
import type { Graph } from './types';
import { bookmark, library } from './fixtures';

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
			(edge) => isCollectionId(edge.source) && isCollectionId(edge.target)
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
