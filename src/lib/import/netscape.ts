import type { Bookmark } from '$lib/types';
import { decodeEntities, escapeHtml } from '$lib/html';
import type { ImportItem } from './types';

/**
 * The Netscape Bookmark File Format — what Chrome, Firefox, Safari and Edge all
 * produce from "Export bookmarks". It is not valid HTML (tags are routinely left
 * unclosed), so we scan it with a tokenizer rather than an HTML parser.
 *
 * Shape:
 *   <DT><H3>Folder</H3>
 *   <DL><p>
 *       <DT><A HREF="..." ADD_DATE="1699999999" TAGS="a,b">Title</A>
 *       <DD>Optional description
 *   </DL><p>
 */
const TOKEN =
	/<dt>\s*<h3[^>]*>([\s\S]*?)<\/h3>|<dl[^>]*>|<\/dl>|<a\s+([^>]*?)>([\s\S]*?)<\/a>|<dd>([^\n<]*)/gi;

/** Pull a named attribute out of a raw tag-attribute string. */
function attr(raw: string, name: string): string | undefined {
	const match = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i').exec(raw);
	return match ? decodeEntities(match[1]) : undefined;
}

/** Browsers write ADD_DATE as unix seconds. Returns an ISO string, or undefined. */
function isoFromAddDate(raw: string | undefined): string | undefined {
	const seconds = Number(raw);
	if (!raw || !Number.isFinite(seconds) || seconds <= 0) return undefined;
	return new Date(seconds * 1000).toISOString();
}

/** Split the `TAGS="a,b"` attribute some exporters write (Firefox, Delicious). */
function parseTagAttr(raw: string | undefined): string[] {
	return (raw ?? '')
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);
}

/**
 * Parse a Netscape bookmark file into import items. Folder nesting becomes a
 * `/`-separated collection path, matching our own collection convention.
 */
export function parseNetscape(html: string): ImportItem[] {
	const items: ImportItem[] = [];
	const folders: string[] = [];
	let pendingFolder: string | undefined;
	let last: ImportItem | undefined;

	for (const match of html.matchAll(TOKEN)) {
		const [token, heading, anchorAttrs, anchorText, description] = match;
		const lower = token.toLowerCase();

		if (heading !== undefined) {
			pendingFolder = decodeEntities(heading);
		} else if (lower.startsWith('</dl')) {
			folders.pop();
		} else if (lower.startsWith('<dl')) {
			folders.push(pendingFolder ?? '');
			pendingFolder = undefined;
		} else if (anchorAttrs !== undefined) {
			const href = attr(anchorAttrs, 'href');
			last = undefined;
			if (!href || !/^https?:\/\//i.test(href)) continue;
			last = {
				url: href,
				title: decodeEntities(anchorText) || undefined,
				tags: parseTagAttr(attr(anchorAttrs, 'tags')),
				collection: folders.filter(Boolean).join('/') || undefined,
				added: isoFromAddDate(attr(anchorAttrs, 'add_date'))
			};
			items.push(last);
		} else if (description !== undefined && last) {
			last.notes = decodeEntities(description) || undefined;
		}
	}

	return items;
}

/**
 * Render bookmarks as a Netscape bookmark file, so they can be imported back into
 * Chrome (or any other browser). Collections become nested folders.
 */
export function serializeNetscape(bookmarks: Bookmark[]): string {
	const lines = [
		'<!DOCTYPE NETSCAPE-Bookmark-file-1>',
		'<!-- This is an automatically generated file. It will be read and overwritten. -->',
		'<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
		'<TITLE>Bookmarks</TITLE>',
		'<H1>Bookmarks</H1>',
		'<DL><p>'
	];

	for (const [collection, entries] of groupByCollection(bookmarks)) {
		const depth = collection ? 1 : 0;
		if (collection) lines.push(`\t<DT><H3>${escapeHtml(collection)}</H3>`, '\t<DL><p>');
		for (const bookmark of entries) lines.push(anchorLine(bookmark, depth + 1));
		if (collection) lines.push('\t</DL><p>');
	}

	lines.push('</DL><p>', '');
	return lines.join('\n');
}

/** Group bookmarks by collection path, uncategorized first, then alphabetically. */
function groupByCollection(bookmarks: Bookmark[]): Map<string, Bookmark[]> {
	const groups = new Map<string, Bookmark[]>();
	for (const bookmark of bookmarks) {
		const key = bookmark.collection ?? '';
		const list = groups.get(key);
		if (list) list.push(bookmark);
		else groups.set(key, [bookmark]);
	}
	return new Map([...groups].sort(([a], [b]) => a.localeCompare(b)));
}

function anchorLine(bookmark: Bookmark, depth: number): string {
	const seconds = Math.floor(new Date(bookmark.added).getTime() / 1000);
	const attrs = [`HREF="${escapeHtml(bookmark.url)}"`];
	if (Number.isFinite(seconds)) attrs.push(`ADD_DATE="${seconds}"`);
	if (bookmark.tags.length) attrs.push(`TAGS="${escapeHtml(bookmark.tags.join(','))}"`);
	if (bookmark.favicon) attrs.push(`ICON_URI="${escapeHtml(bookmark.favicon)}"`);

	const indent = '\t'.repeat(depth);
	const anchor = `${indent}<DT><A ${attrs.join(' ')}>${escapeHtml(bookmark.title)}</A>`;
	const note = bookmark.notes ?? bookmark.description;
	return note ? `${anchor}\n${indent}<DD>${escapeHtml(note)}` : anchor;
}
