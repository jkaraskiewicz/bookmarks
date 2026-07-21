import type { Bookmark } from '$lib/types';
import type { ImportItem, ImportSummary } from '$lib/import/types';
import { ensureScheme } from '$lib/url';
import { exactKey, similarKey } from '$lib/dedupe';
import { transact } from '../store';
import { buildBookmark } from './fields';

/**
 * Adding a batch of bookmarks from elsewhere.
 *
 * Separate from the single-bookmark operations because it answers duplicates
 * differently: adding one by hand refuses and asks, while an import keeps going and
 * reports. Someone importing hundreds cannot answer a prompt for each, and silently
 * dropping a bookmark on a guess is worse than keeping a duplicate.
 */

/** Tracks what is already taken, including bookmarks added earlier in the same batch. */
class SeenUrls {
	private readonly exact = new Map<string, Bookmark>();
	private readonly similar = new Map<string, Bookmark>();

	constructor(existing: Bookmark[]) {
		for (const bookmark of existing) {
			this.exact.set(exactKey(bookmark.url), bookmark);
			this.similar.set(similarKey(bookmark.url), bookmark);
		}
	}

	/** Certainly the same page as one already held. */
	holdsExactly(url: string): boolean {
		return this.exact.has(exactKey(url));
	}

	/** Probably the same page as one already held, if any. */
	probableMatch(url: string): Bookmark | undefined {
		return this.similar.get(similarKey(url));
	}

	add(bookmark: Bookmark): void {
		this.exact.set(exactKey(bookmark.url), bookmark);
		// Only claim the loose key if nothing holds it, so the first bookmark to
		// occupy it stays the one reported as the probable match.
		if (!this.similar.has(similarKey(bookmark.url))) {
			this.similar.set(similarKey(bookmark.url), bookmark);
		}
	}
}

/**
 * Add many bookmarks in a single read-modify-write. URLs already present (in the
 * file or earlier in the batch) are skipped, never overwritten — an import must not
 * clobber notes or tags you've curated here.
 */
export function addBookmarks(items: ImportItem[]): Promise<ImportSummary> {
	return transact((list) => {
		const seen = new SeenUrls(list);
		const created: Bookmark[] = [];
		const possibleDuplicates: ImportSummary['possibleDuplicates'] = [];

		for (const item of items) {
			const url = ensureScheme(item.url);
			if (!url || seen.holdsExactly(url)) continue;

			const probable = seen.probableMatch(url);
			if (probable) possibleDuplicates.push({ url, existing: probable.url });

			const bookmark = buildBookmark(url, item, item.added);
			created.push(bookmark);
			seen.add(bookmark);
		}

		return {
			next: created.length ? [...created, ...list] : undefined,
			result: {
				added: created.length,
				skipped: items.length - created.length,
				possibleDuplicates
			}
		};
	});
}
