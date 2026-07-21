import type { Bookmark, PageMetadata } from '$lib/types';
import { conventionalFavicon, fetchMetadata } from './metadata';
import { transformBookmark } from './repository';
import { createQueue } from './queue';

/**
 * The icon to keep after a fetch.
 *
 * A stored icon is only replaced when it was the fetcher's own guess — the
 * `/favicon.ico` every site is assumed to serve. Anything else was chosen, either by
 * the page declaring it or by hand in the edit dialog, and a refresh must not undo
 * that. It is the whole point of being able to type one in: a site the fetcher
 * cannot read is exactly the site whose guessed icon is wrong, and a bulk refresh
 * would otherwise put the broken guess straight back.
 *
 * To have the fetcher choose again, clear the field — an empty icon is a gap, and
 * gaps get filled.
 */
function preferredFavicon(bookmark: Bookmark, meta: PageMetadata): string | undefined {
	if (!bookmark.favicon) return meta.favicon;
	if (bookmark.favicon === conventionalFavicon(bookmark.url))
		return meta.favicon ?? bookmark.favicon;
	return bookmark.favicon;
}

/** Apply fetched metadata to a bookmark, filling gaps without clobbering user data. */
function applyMetadata(bookmark: Bookmark, meta: PageMetadata): Bookmark {
	return {
		...bookmark,
		// Only replace the title if it's still the placeholder URL.
		title: bookmark.title === bookmark.url && meta.title ? meta.title : bookmark.title,
		description: meta.description ?? bookmark.description,
		favicon: preferredFavicon(bookmark, meta)
	};
}

/**
 * Fetch metadata for a URL and write it back. The network fetch happens *outside*
 * the write lock; only the quick apply-and-persist step is serialized.
 */
export async function refreshMetadata(url: string): Promise<Bookmark | null> {
	const meta = await fetchMetadata(url);
	return transformBookmark(url, (bookmark) => applyMetadata(bookmark, meta));
}

// --- background enrichment ----------------------------------------------------

/**
 * How many pages to fetch at once. Bulk actions can hand over hundreds of URLs, so
 * the pacing lives here rather than each caller guessing at a safe batch size.
 */
const MAX_CONCURRENT_FETCHES = 5;

const queue = createQueue(MAX_CONCURRENT_FETCHES);

/**
 * URLs queued or in flight. Exposed to the client so it can show a "fetching…" state
 * on those rows and poll until they finish.
 */
const pending = new Set<string>();

/** Snapshot of URLs currently awaiting or undergoing enrichment. */
export function pendingMetadata(): string[] {
	return [...pending];
}

/**
 * Queue a background metadata refresh. Returns immediately. Asking twice for the same
 * URL while it is still outstanding is a no-op, so an impatient click or an overlapping
 * bulk action cannot double-fetch.
 */
export function refreshMetadataInBackground(url: string): void {
	if (pending.has(url)) return;
	pending.add(url);

	queue.push(async () => {
		try {
			await refreshMetadata(url);
		} catch (err) {
			console.error('metadata refresh failed:', url, err);
		} finally {
			pending.delete(url);
		}
	});
}
