import type { Bookmark, NewBookmark } from '$lib/types';
import type { ImportItem, ImportSummary } from '$lib/import/types';
import { ensureScheme } from '$lib/url';
import { findDuplicate, exactKey, similarKey } from '$lib/dedupe';
import { readFromDisk, transact } from './store';
import { invalid, conflict, notFound } from './errors';

/**
 * Operations on the bookmark library. Persistence lives in `store.ts`; this module
 * is about what those operations mean — identity, duplicates, and field handling.
 */

/** Read all bookmarks, newest first. Reads fresh from disk every time. */
export async function readBookmarks(): Promise<Bookmark[]> {
	const list = await readFromDisk();
	return list.sort((a, b) => b.added.localeCompare(a.added));
}

/** Trim user-supplied fields; `undefined` means "not provided" (keep existing on update). */
function trimFields(input: NewBookmark) {
	return {
		title: input.title?.trim() || undefined,
		tags: input.tags?.map((t) => t.trim()).filter(Boolean),
		collection: input.collection?.trim() || undefined,
		notes: input.notes?.trim() || undefined
	};
}

/**
 * Build a stored bookmark from user or imported input. `added` lets an import keep
 * the date the bookmark was originally created; otherwise it is created now.
 */
function buildBookmark(url: string, input: NewBookmark, added?: string): Bookmark {
	const fields = trimFields(input);
	return {
		url,
		title: fields.title ?? url,
		tags: fields.tags ?? [],
		collection: fields.collection,
		notes: fields.notes,
		added: added ?? new Date().toISOString()
	};
}

export interface AddResult {
	bookmark: Bookmark;
	created: boolean;
	/** Set when the add was refused: how the existing bookmark matched. */
	duplicate?: 'exact' | 'similar';
}

/**
 * Add a bookmark, refusing duplicates. A *certain* duplicate (same page, differing
 * only in case/port/fragment/tracking params) is always refused. A *probable* one
 * (www, http/https, trailing slash) is refused unless `force` is set, so the caller
 * can ask the user first rather than guessing.
 */
export function addBookmark(input: NewBookmark, force = false): Promise<AddResult> {
	return transact<AddResult>((list) => {
		const url = ensureScheme(input.url);
		if (!url) throw invalid('A URL is required.');

		const { exact, similar } = findDuplicate(list, url);
		if (exact) return { result: { bookmark: exact, created: false, duplicate: 'exact' } };
		if (similar && !force) {
			return { result: { bookmark: similar, created: false, duplicate: 'similar' } };
		}

		const bookmark = buildBookmark(url, input);
		return { next: [bookmark, ...list], result: { bookmark, created: true } };
	});
}

/**
 * Merge user-supplied tags and notes into an existing bookmark — the "add my new
 * tags to it" path when someone re-adds a URL they already have.
 */
export function mergeIntoBookmark(url: string, input: NewBookmark): Promise<Bookmark | null> {
	const fields = trimFields(input);
	return transformBookmark(url, (current) => ({
		...current,
		tags: [...new Set([...current.tags, ...(fields.tags ?? [])])],
		notes: [current.notes, fields.notes].filter(Boolean).join('\n') || undefined
	}));
}

/**
 * Add many bookmarks in a single read-modify-write. URLs already present (in the
 * file or earlier in the batch) are skipped, never overwritten — an import must
 * not clobber notes or tags you've curated here.
 */
export function addBookmarks(items: ImportItem[]): Promise<ImportSummary> {
	return transact((list) => {
		const byExactKey = new Map(list.map((existing) => [exactKey(existing.url), existing]));
		const bySimilarKey = new Map(list.map((existing) => [similarKey(existing.url), existing]));
		const created: Bookmark[] = [];
		const possibleDuplicates: ImportSummary['possibleDuplicates'] = [];

		for (const item of items) {
			const url = ensureScheme(item.url);
			if (!url) continue;

			// Certainly already here: skip quietly.
			if (byExactKey.has(exactKey(url))) continue;

			// Probably already here: import it anyway, but report it — silently
			// dropping a bookmark on a guess is worse than keeping a duplicate.
			const similar = bySimilarKey.get(similarKey(url));
			if (similar) possibleDuplicates.push({ url, existing: similar.url });

			const bookmark = buildBookmark(url, item, item.added);
			created.push(bookmark);
			byExactKey.set(exactKey(url), bookmark);
			if (!similar) bySimilarKey.set(similarKey(url), bookmark);
		}

		const summary: ImportSummary = {
			added: created.length,
			skipped: items.length - created.length,
			possibleDuplicates
		};
		return { next: created.length ? [...created, ...list] : undefined, result: summary };
	});
}

/**
 * Update an existing bookmark identified by its (original) URL. Refuses to point it
 * at a URL another bookmark already occupies, which would otherwise create a
 * duplicate through the back door.
 */
export function updateBookmark(originalUrl: string, changes: NewBookmark): Promise<Bookmark> {
	return transact((list) => {
		const idx = list.findIndex((b) => b.url === originalUrl);
		if (idx === -1) throw notFound();

		const current = list[idx];
		const nextUrl = ensureScheme(changes.url) || current.url;
		if (findDuplicate(list, nextUrl, originalUrl).exact) {
			throw conflict('Another bookmark already uses that URL.');
		}

		const fields = trimFields(changes);
		const updated: Bookmark = {
			...current,
			url: nextUrl,
			title: fields.title ?? current.title,
			tags: fields.tags ?? current.tags,
			collection: fields.collection,
			notes: fields.notes
		};
		const next = [...list];
		next[idx] = updated;
		return { next, result: updated };
	});
}

/** Delete a bookmark by URL. No-op if it doesn't exist. */
export function deleteBookmark(url: string): Promise<void> {
	return deleteBookmarks([url]).then(() => undefined);
}

/**
 * Delete many bookmarks in a single read-modify-write, returning how many went. One
 * transaction rather than one per URL: deleting fifty should not rewrite the file
 * fifty times, and a partial failure should not leave half of them gone.
 */
export function deleteBookmarks(urls: string[]): Promise<number> {
	const doomed = new Set(urls);
	return transact((list) => {
		const next = list.filter((bookmark) => !doomed.has(bookmark.url));
		const removed = list.length - next.length;
		return { next: removed > 0 ? next : undefined, result: removed };
	});
}

/** Apply a function to one bookmark and persist the result. Null if not found. */
export function transformBookmark(
	url: string,
	transform: (bookmark: Bookmark) => Bookmark
): Promise<Bookmark | null> {
	return transact((list) => {
		const idx = list.findIndex((b) => b.url === url);
		if (idx === -1) return { result: null };
		const updated = transform(list[idx]);
		const next = [...list];
		next[idx] = updated;
		return { next, result: updated };
	});
}
