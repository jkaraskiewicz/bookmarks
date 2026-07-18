import { describe, it, expect } from 'vitest';
import { parseChromeBookmarks, folderCounts } from './chromeJson';

/** WebKit epoch: microseconds since 1601-01-01. This one is 2023-12-08T04:13:20Z. */
const CHROME_TIME = '13346482400000000';

const PROFILE = JSON.stringify({
	version: 1,
	roots: {
		bookmark_bar: {
			type: 'folder',
			name: 'Bookmarks bar',
			children: [
				{ type: 'url', name: 'Svelte', url: 'https://svelte.dev', date_added: CHROME_TIME },
				{
					type: 'folder',
					name: 'Open tabs',
					children: [
						{ type: 'url', name: 'Vitest', url: 'https://vitest.dev', date_added: '0' },
						{ type: 'url', name: 'Settings', url: 'chrome://settings' }
					]
				}
			]
		},
		other: {
			type: 'folder',
			name: 'Other bookmarks',
			children: [{ type: 'url', name: 'HN', url: 'https://news.ycombinator.com' }]
		}
	}
});

describe('parseChromeBookmarks', () => {
	const items = parseChromeBookmarks(PROFILE);

	it('walks every root', () => {
		expect(items.map((i) => i.url)).toEqual([
			'https://svelte.dev',
			'https://vitest.dev',
			'https://news.ycombinator.com'
		]);
	});

	it('skips chrome:// internal pages', () => {
		expect(items.some((i) => i.url.startsWith('chrome://'))).toBe(false);
	});

	it('maps folder nesting to a collection path', () => {
		expect(items[0].collection).toBe('Bookmarks bar');
		expect(items[1].collection).toBe('Bookmarks bar/Open tabs');
		expect(items[2].collection).toBe('Other bookmarks');
	});

	it('converts WebKit timestamps to ISO', () => {
		expect(items[0].added).toBe('2023-12-08T04:13:20.000Z');
	});

	it('ignores a zero timestamp', () => {
		expect(items[1].added).toBeUndefined();
	});

	it('can restrict to selected roots', () => {
		const only = parseChromeBookmarks(PROFILE, ['other']);
		expect(only.map((i) => i.url)).toEqual(['https://news.ycombinator.com']);
	});
});

describe('folderCounts', () => {
	it('lists folder paths with their bookmark counts', () => {
		expect(folderCounts(parseChromeBookmarks(PROFILE))).toEqual([
			{ path: 'Bookmarks bar', count: 1 },
			{ path: 'Bookmarks bar/Open tabs', count: 1 },
			{ path: 'Other bookmarks', count: 1 }
		]);
	});
});
