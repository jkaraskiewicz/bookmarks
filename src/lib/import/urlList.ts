import { ensureScheme } from '$lib/url';
import type { ImportItem } from './types';

/**
 * Parse a pasted list of URLs — one per line, as produced by "copy all tab URLs"
 * extensions. Lines may be `url` or `url<tab or spaces>Title`; blanks and `#`
 * comments are ignored.
 */
export function parseUrlList(text: string): ImportItem[] {
	const items: ImportItem[] = [];

	for (const raw of text.split(/\r?\n/)) {
		const line = raw.trim();
		if (!line || line.startsWith('#')) continue;

		const [, urlPart, titlePart] = /^(\S+)(?:\s+(.*))?$/.exec(line) ?? [];
		if (!urlPart) continue;

		const url = ensureScheme(urlPart);
		if (!/^https?:\/\//i.test(url)) continue;

		items.push({ url, title: titlePart?.trim() || undefined, tags: [] });
	}

	return items;
}
