import type { Bookmark, PageMetadata } from '$lib/types';
import { fetchMetadata } from './metadata';
import { transformBookmark } from './repository';
import { createQueue } from './queue';

/** Apply fetched metadata to a bookmark, filling gaps without clobbering user data. */
function applyMetadata(bookmark: Bookmark, meta: PageMetadata): Bookmark {
	return {
		...bookmark,
		// Only replace the title if it's still the placeholder URL.
		title: bookmark.title === bookmark.url && meta.title ? meta.title : bookmark.title,
		description: meta.description ?? bookmark.description,
		favicon: meta.favicon ?? bookmark.favicon
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
