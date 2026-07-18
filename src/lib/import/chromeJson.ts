import type { ImportItem } from './types';

/**
 * Chrome stores its live bookmarks as JSON in the user profile ("Bookmarks" file).
 * Reading it directly skips the manual export step. Structure:
 *
 *   { roots: { bookmark_bar: <folder>, other: <folder>, synced: <folder> } }
 *   folder := { type: "folder", name, children: [<node>] }
 *   link   := { type: "url", name, url, date_added }
 */
interface ChromeNode {
	type?: string;
	name?: string;
	url?: string;
	date_added?: string;
	children?: ChromeNode[];
}

interface ChromeBookmarksFile {
	roots?: Record<string, ChromeNode>;
}

/**
 * Chrome timestamps are microseconds since 1601-01-01 (the WebKit epoch), not the
 * unix epoch. Convert to an ISO string.
 */
const WEBKIT_EPOCH_OFFSET_MS = 11644473600000;

function isoFromChromeTime(raw: string | undefined): string | undefined {
	if (!raw || !/^\d+$/.test(raw)) return undefined;
	const ms = Number(BigInt(raw) / 1000n) - WEBKIT_EPOCH_OFFSET_MS;
	return ms > 0 ? new Date(ms).toISOString() : undefined;
}

/** Collect the links in a folder subtree, tagged with their `/`-joined folder path. */
function collectLinks(node: ChromeNode, path: string[]): ImportItem[] {
	if (node.type === 'url' || node.url) {
		if (!node.url || !/^https?:\/\//i.test(node.url)) return [];
		return [
			{
				url: node.url,
				title: node.name?.trim() || undefined,
				tags: [],
				collection: path.filter(Boolean).join('/') || undefined,
				added: isoFromChromeTime(node.date_added)
			}
		];
	}

	const childPath = [...path, node.name ?? ''];
	return (node.children ?? []).flatMap((child) => collectLinks(child, childPath));
}

/** The folder roots Chrome always defines, in the order we present them. */
const ROOT_LABELS: Record<string, string> = {
	bookmark_bar: 'Bookmarks bar',
	other: 'Other bookmarks',
	synced: 'Mobile bookmarks'
};

/**
 * Parse the contents of a Chrome "Bookmarks" JSON file. `rootKeys` limits which
 * top-level roots are read (defaults to all of them).
 */
export function parseChromeBookmarks(json: string, rootKeys?: string[]): ImportItem[] {
	const file = JSON.parse(json) as ChromeBookmarksFile;
	const items: ImportItem[] = [];

	for (const [key, root] of Object.entries(file.roots ?? {})) {
		if (rootKeys && !rootKeys.includes(key)) continue;
		if (!root || typeof root !== 'object') continue;
		items.push(...collectLinks({ ...root, name: root.name || ROOT_LABELS[key] || key }, []));
	}

	return items;
}

/**
 * List the folder paths across already-parsed items, with how many bookmarks each
 * holds directly. Used to let the user pick a single folder to import (e.g. the one
 * "Bookmark all tabs" just created). Takes items rather than JSON so the caller can
 * parse the profile once and derive everything it needs from that.
 */
export function folderCounts(items: ImportItem[]): { path: string; count: number }[] {
	const counts = new Map<string, number>();
	for (const item of items) {
		const path = item.collection ?? '';
		counts.set(path, (counts.get(path) ?? 0) + 1);
	}
	return [...counts]
		.map(([path, count]) => ({ path, count }))
		.sort((a, b) => a.path.localeCompare(b.path));
}
