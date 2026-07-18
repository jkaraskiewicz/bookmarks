import { decodeEntities } from '$lib/html';
import { splitList } from '$lib/tags';
import type { ImportItem } from '../types';

/** Tokens we care about: a folder heading, a list open/close, a link, a description. */
const TOKEN_PATTERN =
	/<dt>\s*<h3[^>]*>([\s\S]*?)<\/h3>|<dl[^>]*>|<\/dl>|<a\s+([^>]*?)>([\s\S]*?)<\/a>|<dd>([^\n<]*)/gi;

/** Pull a named attribute out of a raw tag-attribute string. */
function readAttribute(raw: string, name: string): string | undefined {
	const match = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i').exec(raw);
	return match ? decodeEntities(match[1]) : undefined;
}

/** Browsers write ADD_DATE as unix seconds. Returns an ISO string, or undefined. */
function isoFromAddDate(raw: string | undefined): string | undefined {
	const seconds = Number(raw);
	if (!raw || !Number.isFinite(seconds) || seconds <= 0) return undefined;
	return new Date(seconds * 1000).toISOString();
}

/**
 * Parse a Netscape bookmark file into import items. Folder nesting becomes a
 * `/`-separated collection path, matching our own collection convention.
 */
export function parseNetscape(html: string): ImportItem[] {
	const items: ImportItem[] = [];
	const folderStack: string[] = [];
	let pendingFolder: string | undefined;
	let currentItem: ImportItem | undefined;

	for (const match of html.matchAll(TOKEN_PATTERN)) {
		const [token, heading, anchorAttributes, anchorText, description] = match;
		const lowerToken = token.toLowerCase();

		if (heading !== undefined) {
			pendingFolder = decodeEntities(heading);
		} else if (lowerToken.startsWith('</dl')) {
			folderStack.pop();
		} else if (lowerToken.startsWith('<dl')) {
			folderStack.push(pendingFolder ?? '');
			pendingFolder = undefined;
		} else if (anchorAttributes !== undefined) {
			const href = readAttribute(anchorAttributes, 'href');
			currentItem = undefined;
			if (!href || !/^https?:\/\//i.test(href)) continue;
			currentItem = {
				url: href,
				title: decodeEntities(anchorText) || undefined,
				tags: splitList(readAttribute(anchorAttributes, 'tags'), /,/),
				collection: folderStack.filter(Boolean).join('/') || undefined,
				added: isoFromAddDate(readAttribute(anchorAttributes, 'add_date'))
			};
			items.push(currentItem);
		} else if (description !== undefined && currentItem) {
			currentItem.notes = decodeEntities(description) || undefined;
		}
	}

	return items;
}
