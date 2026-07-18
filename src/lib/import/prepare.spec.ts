import { describe, it, expect } from 'vitest';
import { prepareItems } from './prepare';
import type { ImportItem } from './types';

const items: ImportItem[] = [
	{ url: 'https://a.dev', tags: ['x'], collection: 'Dev' },
	{ url: 'https://b.dev', tags: [], collection: 'Dev/Tools' },
	{ url: 'https://a.dev', tags: ['dup'] },
	{ url: 'https://c.dev', tags: [] }
];

describe('prepareItems', () => {
	it('drops duplicate URLs within the batch, keeping the first', () => {
		const out = prepareItems(items);
		expect(out.map((i) => i.url)).toEqual(['https://a.dev', 'https://b.dev', 'https://c.dev']);
		expect(out[0].tags).toEqual(['x']);
	});

	it('prefixes collections without disturbing uncategorized items', () => {
		const out = prepareItems(items, { collectionPrefix: 'Imported' });
		expect(out[0].collection).toBe('Imported/Dev');
		expect(out[1].collection).toBe('Imported/Dev/Tools');
		expect(out[2].collection).toBe('Imported');
	});

	it('merges extra tags without duplicating existing ones', () => {
		const out = prepareItems(items, { extraTags: ['chrome', 'x'] });
		expect(out[0].tags).toEqual(['x', 'chrome']);
		expect(out[1].tags).toEqual(['chrome', 'x']);
	});

	it('scopes to a collection and everything beneath it', () => {
		const out = prepareItems(items, { onlyCollection: 'Dev' });
		expect(out.map((i) => i.url)).toEqual(['https://a.dev', 'https://b.dev']);
	});

	it('returns nothing when the scope matches no item', () => {
		expect(prepareItems(items, { onlyCollection: 'Nope' })).toEqual([]);
	});
});
