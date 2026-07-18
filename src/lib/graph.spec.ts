import { describe, it, expect } from 'vitest';
import { buildGraph } from './graph';
import type { Bookmark } from './types';

function bm(over: Partial<Bookmark>): Bookmark {
	return { url: 'https://x', title: 't', tags: [], added: '2026-01-01', ...over };
}

describe('buildGraph', () => {
	const data: Bookmark[] = [
		bm({ url: 'https://a', title: 'A', tags: ['docs'], collection: 'Dev' }),
		bm({ url: 'https://b', title: 'B', tags: ['docs', 'news'], collection: 'Dev' }),
		bm({ url: 'https://c', title: 'C', tags: ['news'], collection: 'Solo' })
	];

	it('creates a bookmark node for every bookmark', () => {
		const g = buildGraph(data);
		const bookmarks = g.nodes.filter((n) => n.kind === 'bookmark');
		expect(bookmarks.map((n) => n.label).sort()).toEqual(['A', 'B', 'C']);
	});

	it('creates hub nodes only for attributes shared by >= 2 bookmarks', () => {
		const g = buildGraph(data);
		const hubs = g.nodes.filter((n) => n.kind !== 'bookmark').map((n) => n.label);
		// #docs (A,B), #news (B,C), Dev (A,B) qualify; Solo (only C) does not.
		expect(hubs.sort()).toEqual(['#docs', '#news', 'Dev']);
	});

	it('links each bookmark to the hubs it belongs to', () => {
		const g = buildGraph(data);
		const targetsOf = (url: string) =>
			g.edges
				.filter((e) => e.source === `b:${url}`)
				.map((e) => e.target)
				.sort();
		expect(targetsOf('https://a')).toEqual(['c:Dev', 't:docs']);
		expect(targetsOf('https://b')).toEqual(['c:Dev', 't:docs', 't:news']);
		expect(targetsOf('https://c')).toEqual(['t:news']); // Solo collection dropped
	});

	it('records degree (connection count) on nodes', () => {
		const g = buildGraph(data);
		const byId = new Map(g.nodes.map((n) => [n.id, n]));
		expect(byId.get('b:https://b')?.degree).toBe(3); // docs, news, Dev
		expect(byId.get('t:docs')?.degree).toBe(2);
		expect(byId.get('b:https://c')?.degree).toBe(1);
	});

	it('respects a custom minShared threshold', () => {
		const g = buildGraph(data, 3);
		// No attribute is shared by 3 bookmarks, so there are no hubs/edges.
		expect(g.nodes.every((n) => n.kind === 'bookmark')).toBe(true);
		expect(g.edges).toEqual([]);
	});
});
