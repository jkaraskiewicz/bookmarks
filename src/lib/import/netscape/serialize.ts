import type { Bookmark } from '$lib/types';
import { escapeHtml } from '$lib/html';

/**
 * Render bookmarks as a Netscape bookmark file, so they can be imported back into
 * Chrome (or any other browser). Collections become nested folders.
 */
export function serializeNetscape(bookmarks: Bookmark[]): string {
	return [
		'<!DOCTYPE NETSCAPE-Bookmark-file-1>',
		'<!-- This is an automatically generated file. It will be read and overwritten. -->',
		'<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
		'<TITLE>Bookmarks</TITLE>',
		'<H1>Bookmarks</H1>',
		'<DL><p>',
		...folderLines(buildFolderTree(bookmarks), 1),
		'</DL><p>',
		''
	].join('\n');
}

/**
 * A collection path maps onto real nested folders: `Dev/Frameworks` must be written as
 * a `Frameworks` folder inside a `Dev` folder, not one folder named "Dev/Frameworks".
 */
interface Folder {
	children: Map<string, Folder>;
	bookmarks: Bookmark[];
}

const emptyFolder = (): Folder => ({ children: new Map(), bookmarks: [] });

/** Nest bookmarks into folders by splitting each collection path on `/`. */
function buildFolderTree(bookmarks: Bookmark[]): Folder {
	const root = emptyFolder();

	for (const bookmark of bookmarks) {
		const segments = (bookmark.collection ?? '')
			.split('/')
			.map((s) => s.trim())
			.filter(Boolean);

		let folder = root;
		for (const name of segments) {
			let child = folder.children.get(name);
			if (!child) {
				child = emptyFolder();
				folder.children.set(name, child);
			}
			folder = child;
		}
		folder.bookmarks.push(bookmark);
	}

	return root;
}

/** Render a folder's contents: its own bookmarks first, then subfolders, alphabetically. */
function folderLines(folder: Folder, depth: number): string[] {
	const indent = '\t'.repeat(depth);
	const lines = folder.bookmarks.map((bookmark) => anchorLine(bookmark, indent));

	for (const [name, child] of [...folder.children].sort(([a], [b]) => a.localeCompare(b))) {
		lines.push(
			`${indent}<DT><H3>${escapeHtml(name)}</H3>`,
			`${indent}<DL><p>`,
			...folderLines(child, depth + 1),
			`${indent}</DL><p>`
		);
	}

	return lines;
}

function anchorLine(bookmark: Bookmark, indent: string): string {
	const seconds = Math.floor(new Date(bookmark.added).getTime() / 1000);
	const attrs = [`HREF="${escapeHtml(bookmark.url)}"`];
	if (Number.isFinite(seconds)) attrs.push(`ADD_DATE="${seconds}"`);
	if (bookmark.tags.length) attrs.push(`TAGS="${escapeHtml(bookmark.tags.join(','))}"`);
	if (bookmark.favicon) attrs.push(`ICON_URI="${escapeHtml(bookmark.favicon)}"`);

	const anchor = `${indent}<DT><A ${attrs.join(' ')}>${escapeHtml(bookmark.title)}</A>`;
	const note = bookmark.notes ?? bookmark.description;
	return note ? `${anchor}\n${indent}<DD>${escapeHtml(note)}` : anchor;
}
