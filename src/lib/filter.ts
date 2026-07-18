import type { Bookmark } from './types';
import { inCollection } from './collections';

export interface BookmarkFilter {
	/** Free-text query matched against title, url, notes and description. */
	search: string;
	/** Bookmark must contain every selected tag. */
	tags: string[];
	/** Selected collection path ('' = all); matches the node and its descendants. */
	collection: string;
}

function matchesSearch(bookmark: Bookmark, query: string): boolean {
	if (!query) return true;
	const haystack = [bookmark.title, bookmark.url, bookmark.notes, bookmark.description];
	return haystack.some((field) => field?.toLowerCase().includes(query));
}

/** Filter bookmarks by search text, required tags, and selected collection. */
export function filterBookmarks(bookmarks: Bookmark[], filter: BookmarkFilter): Bookmark[] {
	const query = filter.search.trim().toLowerCase();
	return bookmarks.filter(
		(bookmark) =>
			matchesSearch(bookmark, query) &&
			filter.tags.every((tag) => bookmark.tags.includes(tag)) &&
			inCollection(bookmark.collection, filter.collection)
	);
}

/** Every distinct tag across the given bookmarks, sorted. */
export function allTags(bookmarks: Bookmark[]): string[] {
	const unique = new Set(bookmarks.flatMap((bookmark) => bookmark.tags));
	return [...unique].sort((a, b) => a.localeCompare(b));
}
