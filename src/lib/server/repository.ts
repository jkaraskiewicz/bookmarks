import { dirname } from 'node:path';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import type { Bookmark, NewBookmark } from '$lib/types';
import type { ImportItem, ImportSummary } from '$lib/import/types';
import { normalizeUrl } from '$lib/url';
import { findDuplicate, strictKey, looseKey } from '$lib/dedupe';
import { parseBookmarks, serializeBookmarks } from './toml';
import { bookmarksFile } from './config';
import { createMutex } from './mutex';
import { invalid, conflict, notFound } from './errors';

const lock = createMutex();

async function readFromDisk(): Promise<Bookmark[]> {
	try {
		return parseBookmarks(await readFile(bookmarksFile(), 'utf-8'));
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
		throw err;
	}
}

async function writeToDisk(bookmarks: Bookmark[]): Promise<void> {
	const path = bookmarksFile();
	await mkdir(dirname(path), { recursive: true });
	const tmp = `${path}.tmp`;
	await writeFile(tmp, serializeBookmarks(bookmarks), 'utf-8');
	await rename(tmp, path); // atomic replace
}

/**
 * Run a read-modify-write transaction under the write lock. The mutator receives
 * the current list and returns the `next` list to persist (omit to skip writing)
 * plus a `result` to return to the caller.
 */
function transact<T>(mutate: (list: Bookmark[]) => { next?: Bookmark[]; result: T }): Promise<T> {
	return lock(async () => {
		const list = await readFromDisk();
		const { next, result } = mutate(list);
		if (next) await writeToDisk(next);
		return result;
	});
}

/** Read all bookmarks, newest first. Reads fresh from disk every time. */
export async function readBookmarks(): Promise<Bookmark[]> {
	const list = await readFromDisk();
	return list.sort((a, b) => b.added.localeCompare(a.added));
}

/** Trim user-supplied fields; `undefined` means "not provided" (keep existing on update). */
function normalizeFields(input: NewBookmark) {
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
	const fields = normalizeFields(input);
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
		const url = normalizeUrl(input.url);
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
	const fields = normalizeFields(input);
	return updateBookmarkByUrl(url, (current) => ({
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
		const known = new Map(list.map((b) => [strictKey(b.url), b]));
		const loose = new Map(list.map((b) => [looseKey(b.url), b]));
		const created: Bookmark[] = [];
		const possible: ImportSummary['possibleDuplicates'] = [];

		for (const item of items) {
			const url = normalizeUrl(item.url);
			if (!url) continue;

			// Certainly already here: skip quietly.
			if (known.has(strictKey(url))) continue;

			// Probably already here: import it anyway, but report it — silently
			// dropping a bookmark on a guess is worse than keeping a duplicate.
			const near = loose.get(looseKey(url));
			if (near) possible.push({ url, existing: near.url });

			const bookmark = buildBookmark(url, item, item.added);
			created.push(bookmark);
			known.set(strictKey(url), bookmark);
			if (!near) loose.set(looseKey(url), bookmark);
		}

		const summary: ImportSummary = {
			added: created.length,
			skipped: items.length - created.length,
			possibleDuplicates: possible
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
		const nextUrl = normalizeUrl(changes.url) || current.url;
		if (findDuplicate(list, nextUrl, originalUrl).exact) {
			throw conflict('Another bookmark already uses that URL.');
		}

		const fields = normalizeFields(changes);
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
	return transact((list) => {
		const next = list.filter((b) => b.url !== url);
		return { next: next.length !== list.length ? next : undefined, result: undefined };
	});
}

/** Apply a transformation to one bookmark (by URL) and persist it. Null if not found. */
export function updateBookmarkByUrl(
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
