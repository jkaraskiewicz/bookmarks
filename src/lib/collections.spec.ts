import { describe, it, expect } from 'vitest';
import { buildCollectionTree, flattenCollectionTree, inCollection } from './collections';
import type { Bookmark } from './types';

function bm(collection?: string): Bookmark {
	return { url: `https://x/${collection}`, title: 't', tags: [], collection, added: '2026-01-01' };
}

describe('buildCollectionTree', () => {
	it('nests paths and aggregates counts up the ancestry', () => {
		const tree = buildCollectionTree([bm('Dev/Frameworks'), bm('Dev/Tools'), bm('Dev/Frameworks')]);
		expect(tree).toHaveLength(1);
		const dev = tree[0];
		expect(dev).toMatchObject({ name: 'Dev', path: 'Dev', count: 3 });
		expect(dev.children.map((c) => [c.name, c.count])).toEqual([
			['Frameworks', 2],
			['Tools', 1]
		]);
	});

	it('ignores bookmarks without a collection', () => {
		expect(buildCollectionTree([bm(), bm('')])).toEqual([]);
	});

	it('sorts siblings alphabetically', () => {
		const tree = buildCollectionTree([bm('News'), bm('Dev'), bm('Art')]);
		expect(tree.map((n) => n.name)).toEqual(['Art', 'Dev', 'News']);
	});
});

describe('flattenCollectionTree', () => {
	it('returns every path, sorted', () => {
		const tree = buildCollectionTree([bm('Dev/Tools'), bm('Dev/Frameworks'), bm('News')]);
		expect(flattenCollectionTree(tree)).toEqual(['Dev', 'Dev/Frameworks', 'Dev/Tools', 'News']);
	});
});

describe('inCollection', () => {
	it('matches everything when nothing is selected', () => {
		expect(inCollection('Dev', '')).toBe(true);
		expect(inCollection(undefined, '')).toBe(true);
	});

	it('matches the node itself and its descendants', () => {
		expect(inCollection('Dev', 'Dev')).toBe(true);
		expect(inCollection('Dev/Frameworks', 'Dev')).toBe(true);
	});

	it('does not match siblings or partial-segment prefixes', () => {
		expect(inCollection('News', 'Dev')).toBe(false);
		expect(inCollection('Development', 'Dev')).toBe(false); // "Dev/" boundary, not substring
		expect(inCollection(undefined, 'Dev')).toBe(false);
	});
});
