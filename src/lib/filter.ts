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
	const fields = [bookmark.title, bookmark.url, bookmark.notes, bookmark.description];
	return fields.some((f) => f?.toLowerCase().includes(query));
}

/** Filter bookmarks by search text, required tags, and selected collection. */
export function filterBookmarks(bookmarks: Bookmark[], filter: BookmarkFilter): Bookmark[] {
	const query = filter.search.trim().toLowerCase();
	return bookmarks.filter(
		(b) =>
			matchesSearch(b, query) &&
			filter.tags.every((t) => b.tags.includes(t)) &&
			inCollection(b.collection, filter.collection)
	);
}

/** Every distinct tag across the given bookmarks, sorted. */
export function allTags(bookmarks: Bookmark[]): string[] {
	return [...new Set(bookmarks.flatMap((b) => b.tags))].sort((a, b) => a.localeCompare(b));
}
