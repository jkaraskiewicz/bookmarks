import type { Bookmark, PageMetadata } from '$lib/types';
import { fetchMetadata } from './metadata';
import { transformBookmark } from './repository';

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

// --- background enrichment registry ------------------------------------------
// URLs whose metadata is currently being fetched. Exposed to the client so it can
// show a "fetching…" state and poll until enrichment finishes.
const pending = new Set<string>();

/** Snapshot of URLs currently being enriched. */
export function pendingMetadata(): string[] {
	return [...pending];
}

/** Kick off a background metadata refresh without blocking the caller. */
export function refreshMetadataInBackground(url: string): void {
	pending.add(url);
	refreshMetadata(url)
		.catch((err) => console.error('metadata refresh failed:', err))
		.finally(() => pending.delete(url));
}
