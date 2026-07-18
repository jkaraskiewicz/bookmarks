import { describe, it, expect } from 'vitest';
import { parseNetscape } from './parse';

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
