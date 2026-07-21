import type { Bookmark, NewBookmark } from '$lib/types';
import { ensureScheme } from '$lib/url';
import { findDuplicate } from '$lib/dedupe';
import { readFromDisk, transact } from '../store';
import { invalid, conflict, notFound } from '../errors';
import { buildBookmark, trimFields } from './fields';

/**
 * Operations on one bookmark at a time. Persistence lives in `store.ts` and field
 * shaping in `fields.ts`; this module is about what the operations mean — identity,
 * duplicates, and what each one is allowed to overwrite.
 */

/** Read all bookmarks, newest first. Reads fresh from disk every time. */
export async function readBookmarks(): Promise<Bookmark[]> {
	const list = await readFromDisk();
	return list.sort((a, b) => b.added.localeCompare(a.added));
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
			notes: fields.notes,
			// Emptying the field clears the icon, which is also how you ask the fetcher
			// to have another go: it fills a bookmark that has none.
			favicon: fields.favicon
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
