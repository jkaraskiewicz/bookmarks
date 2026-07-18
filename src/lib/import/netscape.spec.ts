import { describe, it, expect } from 'vitest';
import { parseNetscape, serializeNetscape } from './netscape';
import type { Bookmark } from '$lib/types';

// A realistic Chrome export: unclosed <DT>/<p> tags, nested folders, an ICON blob.
const CHROME_EXPORT = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1600000000" PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>
    <DL><p>
        <DT><A HREF="https://svelte.dev" ADD_DATE="1700000000" ICON="data:image/png;base64,AAA">Svelte</A>
        <DT><H3>Dev</H3>
        <DL><p>
            <DT><A HREF="https://vitest.dev" ADD_DATE="1700000001">Vitest &amp; friends</A>
            <DD>Test runner
        </DL><p>
    </DL><p>
    <DT><H3>Other bookmarks</H3>
    <DL><p>
        <DT><A HREF="javascript:void(0)">Some bookmarklet</A>
        <DT><A HREF="https://news.ycombinator.com">Hacker News</A>
    </DL><p>
</DL><p>`;

describe('parseNetscape', () => {
	const items = parseNetscape(CHROME_EXPORT);

	it('extracts every http(s) bookmark', () => {
		expect(items.map((i) => i.url)).toEqual([
			'https://svelte.dev',
			'https://vitest.dev',
			'https://news.ycombinator.com'
		]);
	});

	it('skips non-http entries like bookmarklets', () => {
		expect(items.some((i) => i.url.startsWith('javascript:'))).toBe(false);
	});

	it('turns folder nesting into a collection path', () => {
		expect(items[0].collection).toBe('Bookmarks bar');
		expect(items[1].collection).toBe('Bookmarks bar/Dev');
		expect(items[2].collection).toBe('Other bookmarks');
	});

	it('decodes entities in titles', () => {
		expect(items[1].title).toBe('Vitest & friends');
	});

	it('preserves the original add date', () => {
		expect(items[0].added).toBe(new Date(1700000000 * 1000).toISOString());
	});

	it('attaches a <DD> description to the preceding bookmark', () => {
		expect(items[1].notes).toBe('Test runner');
		expect(items[0].notes).toBeUndefined();
	});

	it('leaves add date undefined when the source has none', () => {
		expect(items[2].added).toBeUndefined();
	});

	it('reads the TAGS attribute when present', () => {
		const [item] = parseNetscape('<DT><A HREF="https://x.dev" TAGS="a, b">X</A>');
		expect(item.tags).toEqual(['a', 'b']);
	});

	it('returns nothing for empty or junk input', () => {
		expect(parseNetscape('')).toEqual([]);
		expect(parseNetscape('<html><body>hi</body></html>')).toEqual([]);
	});
});

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
