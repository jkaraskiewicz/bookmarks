import { describe, it, expect } from 'vitest';
import { serializeNetscape } from './serialize';
import { parseNetscape } from './parse';
import type { Bookmark } from '$lib/types';

describe('serializeNetscape', () => {
	const bookmarks: Bookmark[] = [
		{
			url: 'https://svelte.dev',
			title: 'Svelte & Kit',
			tags: ['frontend', 'docs'],
			collection: 'Dev',
			added: '2026-07-18T10:00:00.000Z'
		},
		{
			url: 'https://news.ycombinator.com',
			title: 'Hacker News',
			tags: [],
			notes: 'Daily read',
			added: '2026-07-18T11:00:00.000Z'
		}
	];

	it('produces a file browsers recognise', () => {
		expect(serializeNetscape(bookmarks)).toMatch(/^<!DOCTYPE NETSCAPE-Bookmark-file-1>/);
	});

	it('escapes titles and writes tags + add dates', () => {
		const html = serializeNetscape(bookmarks);
		expect(html).toContain('Svelte &amp; Kit');
		expect(html).toContain('TAGS="frontend,docs"');
		expect(html).toContain(`ADD_DATE="${Math.floor(Date.parse('2026-07-18T10:00:00Z') / 1000)}"`);
	});

	it('nests collections as folders and notes as <DD>', () => {
		const html = serializeNetscape(bookmarks);
		expect(html).toContain('<DT><H3>Dev</H3>');
		expect(html).toContain('<DD>Daily read');
	});

	it('writes a nested collection path as real nested folders', () => {
		// Regression: `Dev/Frameworks` used to emit one folder literally named
		// "Dev/Frameworks", which Chrome shows as a slash in the folder name.
		const html = serializeNetscape([
			{
				url: 'https://svelte.dev',
				title: 'Svelte',
				tags: [],
				collection: 'Dev/Frameworks',
				added: '2026-07-18T10:00:00.000Z'
			}
		]);

		expect(html).not.toContain('<H3>Dev/Frameworks</H3>');
		expect(html).toContain('<H3>Dev</H3>');
		expect(html).toContain('<H3>Frameworks</H3>');
		// Frameworks must open inside Dev, before Dev closes.
		expect(html.indexOf('<H3>Dev</H3>')).toBeLessThan(html.indexOf('<H3>Frameworks</H3>'));
		expect(parseNetscape(html)[0].collection).toBe('Dev/Frameworks');
	});

	it('keeps sibling subfolders separate', () => {
		const html = serializeNetscape([
			{
				url: 'https://a.dev',
				title: 'A',
				tags: [],
				collection: 'Dev/Frameworks',
				added: '2026-07-18T10:00:00.000Z'
			},
			{
				url: 'https://b.dev',
				title: 'B',
				tags: [],
				collection: 'Dev/Tools',
				added: '2026-07-18T10:00:00.000Z'
			}
		]);

		const parsed = parseNetscape(html);
		expect(parsed.find((p) => p.url === 'https://a.dev')?.collection).toBe('Dev/Frameworks');
		expect(parsed.find((p) => p.url === 'https://b.dev')?.collection).toBe('Dev/Tools');
		// One shared `Dev` parent, not one per child.
		expect(html.match(/<H3>Dev<\/H3>/g)).toHaveLength(1);
	});

	it('round-trips through the parser', () => {
		const parsed = parseNetscape(serializeNetscape(bookmarks));
		expect(parsed.map((p) => p.url).sort()).toEqual(bookmarks.map((b) => b.url).sort());

		const svelte = parsed.find((p) => p.url === 'https://svelte.dev');
		expect(svelte?.title).toBe('Svelte & Kit');
		expect(svelte?.collection).toBe('Dev');
		expect(svelte?.tags).toEqual(['frontend', 'docs']);
		expect(svelte?.added).toBe('2026-07-18T10:00:00.000Z');
	});
});
