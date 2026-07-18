import { parse, stringify } from 'smol-toml';
import type { Bookmark } from '$lib/types';

const HEADER = `# bookmarks.toml — your bookmarks, one [[bookmark]] block each.
# Edit by hand or via the web UI. The only required field is \`url\`.
# Note: the app normalizes formatting when it rewrites this file, so
# hand-written comments inside bookmark blocks may not be preserved.

`;

/** Coerce an arbitrary parsed TOML table into a well-formed Bookmark. */
function normalize(raw: unknown): Bookmark | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const r = raw as Record<string, unknown>;

	const url = typeof r.url === 'string' ? r.url.trim() : '';
	if (!url) return null; // a bookmark without a URL is meaningless

	const tags = Array.isArray(r.tags)
		? r.tags.filter((t): t is string => typeof t === 'string').map((t) => t.trim())
		: [];

	const str = (v: unknown): string | undefined => {
		if (typeof v !== 'string') return undefined;
		const t = v.trim();
		return t.length > 0 ? t : undefined;
	};

	// TOML datetimes parse to Date; also accept an ISO string. Fall back to now.
	let added: string;
	if (r.added instanceof Date) added = r.added.toISOString();
	else if (typeof r.added === 'string' && !Number.isNaN(Date.parse(r.added)))
		added = new Date(r.added).toISOString();
	else added = new Date().toISOString();

	return {
		url,
		title: str(r.title) ?? url,
		tags,
		collection: str(r.collection),
		notes: str(r.notes),
		description: str(r.description),
		favicon: str(r.favicon),
		added
	};
}

/** Parse the raw contents of a bookmarks.toml file into normalized bookmarks. */
export function parseBookmarks(raw: string): Bookmark[] {
	const data = parse(raw) as { bookmark?: unknown };
	const list = Array.isArray(data.bookmark) ? data.bookmark : [];
	return list.map(normalize).filter((b): b is Bookmark => b !== null);
}

/** Serialize bookmarks back into TOML text, with a friendly header. */
export function serializeBookmarks(bookmarks: Bookmark[]): string {
	const doc = {
		bookmark: bookmarks.map((b) => {
			// Insertion order here controls field order in the file.
			const out: Record<string, unknown> = {
				title: b.title,
				url: b.url,
				tags: b.tags
			};
			if (b.collection) out.collection = b.collection;
			if (b.notes) out.notes = b.notes;
			if (b.description) out.description = b.description;
			if (b.favicon) out.favicon = b.favicon;
			out.added = new Date(b.added);
			return out;
		})
	};
	return HEADER + stringify(doc) + '\n';
}
