import { parse, stringify } from 'smol-toml';
import type { Bookmark } from '$lib/types';

const HEADER = `# bookmarks.toml — your bookmarks, one [[bookmark]] block each.
# Edit by hand or via the web UI. The only required field is \`url\`.
# Note: the app normalizes formatting when it rewrites this file, so
# hand-written comments inside bookmark blocks may not be preserved.

`;

/** Coerce one parsed TOML table into a well-formed Bookmark, or null if unusable. */
function toBookmark(raw: unknown): Bookmark | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const table = raw as Record<string, unknown>;

	const url = typeof table.url === 'string' ? table.url.trim() : '';
	if (!url) return null; // a bookmark without a URL is meaningless

	return {
		url,
		title: trimmedText(table.title) ?? url,
		tags: trimmedTags(table.tags),
		collection: trimmedText(table.collection),
		notes: trimmedText(table.notes),
		description: trimmedText(table.description),
		favicon: trimmedText(table.favicon),
		added: addedTimestamp(table.added)
	};
}

/** A trimmed string, or undefined if the value is not a string or is blank. */
function trimmedText(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	return value.trim() || undefined;
}

/** Trimmed string entries of a tag array; anything else yields no tags. */
function trimmedTags(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((tag) => typeof tag === 'string').map((tag) => tag.trim());
}

/** TOML datetimes parse to Date; an ISO string is accepted too. Falls back to now. */
function addedTimestamp(value: unknown): string {
	if (value instanceof Date) return value.toISOString();
	if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
		return new Date(value).toISOString();
	}
	return new Date().toISOString();
}

/** Parse the raw contents of a bookmarks.toml file into normalized bookmarks. */
export function parseBookmarks(raw: string): Bookmark[] {
	const document = parse(raw) as { bookmark?: unknown };
	const tables = Array.isArray(document.bookmark) ? document.bookmark : [];
	return tables.map(toBookmark).filter((bookmark) => bookmark !== null);
}

/** Serialize bookmarks back into TOML text, with a friendly header. */
export function serializeBookmarks(bookmarks: Bookmark[]): string {
	const document = { bookmark: bookmarks.map(toTable) };
	return HEADER + stringify(document) + '\n';
}

/** One bookmark as a TOML table. Insertion order sets the field order in the file. */
function toTable(bookmark: Bookmark): Record<string, unknown> {
	const table: Record<string, unknown> = {
		title: bookmark.title,
		url: bookmark.url,
		tags: bookmark.tags
	};
	if (bookmark.collection) table.collection = bookmark.collection;
	if (bookmark.notes) table.notes = bookmark.notes;
	if (bookmark.description) table.description = bookmark.description;
	if (bookmark.favicon) table.favicon = bookmark.favicon;
	table.added = new Date(bookmark.added);
	return table;
}
