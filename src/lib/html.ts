/**
 * Read an attribute out of a raw tag (or out of just its attribute list).
 *
 * Deliberately a regex rather than a parser: the two callers — reading a browser's
 * exported bookmarks, and reading `<meta>`/`<link>` from a page's head — both work on
 * markup they only need a few attributes from, and a DOM parser on the server would
 * be a dependency bought for that alone.
 *
 * Accepts either quote style; entities are left encoded, since only some callers
 * want them decoded.
 *
 * The lookbehind is load-bearing: `\b` would let `data-href` answer a request for
 * `href`, because the hyphen counts as a word boundary.
 */
export function attributeValue(tag: string, name: string): string | undefined {
	return new RegExp(`(?<![-\\w])${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(tag)?.[1];
}

/** Decode the handful of HTML entities that commonly show up in titles and links. */
export function decodeEntities(text: string): string {
	return text
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
		.replace(/&amp;/g, '&')
		.trim();
}

/** Escape text for safe inclusion in HTML output (attribute values and text nodes). */
export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
