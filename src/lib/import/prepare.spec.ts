import { describe, it, expect } from 'vitest';
import { applyImportOptions } from './prepare';
import type { ImportItem } from './types';

const items: ImportItem[] = [
	{ url: 'https://a.dev', tags: ['x'], collection: 'Dev' },
	{ url: 'https://b.dev', tags: [], collection: 'Dev/Tools' },
	{ url: 'https://a.dev', tags: ['dup'] },
	{ url: 'https://c.dev', tags: [] }
];

describe('applyImportOptions', () => {
	it('drops duplicate URLs within the batch, keeping the first', () => {
		const out = applyImportOptions(items);
		expect(out.map((i) => i.url)).toEqual(['https://a.dev', 'https://b.dev', 'https://c.dev']);
		expect(out[0].tags).toEqual(['x']);
	});

	it('prefixes collections without disturbing uncategorized items', () => {
		const out = applyImportOptions(items, { collectionPrefix: 'Imported' });
		expect(out[0].collection).toBe('Imported/Dev');
		expect(out[1].collection).toBe('Imported/Dev/Tools');
		expect(out[2].collection).toBe('Imported');
	});

	it('merges extra tags without duplicating existing ones', () => {
		const out = applyImportOptions(items, { extraTags: ['chrome', 'x'] });
		expect(out[0].tags).toEqual(['x', 'chrome']);
		expect(out[1].tags).toEqual(['chrome', 'x']);
	});

	it('scopes to a collection and everything beneath it', () => {
		const out = applyImportOptions(items, { onlyCollection: 'Dev' });
		expect(out.map((i) => i.url)).toEqual(['https://a.dev', 'https://b.dev']);
	});

	it('returns nothing when the scope matches no item', () => {
		expect(applyImportOptions(items, { onlyCollection: 'Nope' })).toEqual([]);
	});
});
