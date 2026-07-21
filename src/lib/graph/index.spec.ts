import { describe, it, expect } from 'vitest';
import { buildGraph, collectionId, tagId, bookmarkId } from './index';
import { bookmark, library, nodeIds } from './fixtures';

describe('buildGraph — overview (nothing expanded)', () => {
	const graph = buildGraph(library);

	it('shows only hubs, so a large library stays readable', () => {
		expect(graph.nodes.every((node) => node.kind !== 'bookmark')).toBe(true);
	});

	it('creates a hub per collection, plus the ancestors they hang from', () => {
		expect(nodeIds(graph)).toContain(collectionId('Dev'));
		expect(nodeIds(graph)).toContain(collectionId('Dev/Frameworks'));
		expect(nodeIds(graph)).toContain(collectionId('Dev/Tools'));
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
		expect(nodeIds(graph)).not.toContain(collectionId('Unfiled'));

		const withUnfiled = buildGraph([...library, bookmark('https://g.dev')]);
		expect(nodeIds(withUnfiled)).toContain(collectionId('Unfiled'));
	});

	it('drops hubs holding fewer than minShared bookmarks', () => {
		expect(nodeIds(graph)).not.toContain(collectionId('News')); // only 1 bookmark
		expect(nodeIds(buildGraph(library, { minShared: 1 }))).toContain(collectionId('News'));
	});

	it('creates tag hubs for shared tags', () => {
		expect(nodeIds(graph)).toContain(tagId('docs'));
		expect(graph.nodes.find((node) => node.id === tagId('docs'))?.count).toBe(2);
	});
});

describe('buildGraph — expanding a hub', () => {
	const expanded = new Set([collectionId('Dev/Frameworks')]);
	const graph = buildGraph(library, { expanded });

	it('reveals just that hub’s bookmarks', () => {
		expect(nodeIds(graph)).toContain(bookmarkId('https://a.dev'));
		expect(nodeIds(graph)).toContain(bookmarkId('https://b.dev'));
		expect(nodeIds(graph)).not.toContain(bookmarkId('https://c.dev')); // lives in Dev/Tools
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
		expect(nodeIds(graph)).toContain(bookmarkId('https://c.dev'));
		expect(nodeIds(graph)).not.toContain(bookmarkId('https://a.dev'));
	});

	it('matches on collection and tag as well as url', () => {
		expect(nodeIds(buildGraph(library, { search: 'Frameworks' }))).toContain(
			bookmarkId('https://a.dev')
		);
		expect(nodeIds(buildGraph(library, { search: 'docs' }))).toContain(bookmarkId('https://b.dev'));
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
		const appearances = nodeIds(graph).filter((id) => id === bookmarkId('https://a.dev'));
		expect(appearances).toHaveLength(1);
	});
});
