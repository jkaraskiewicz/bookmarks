import { dirname } from 'node:path';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import type { Bookmark, NewBookmark } from '$lib/types';
import type { ImportItem, ImportSummary } from '$lib/import/types';
import { normalizeUrl } from '$lib/url';
import { parseBookmarks, serializeBookmarks } from './toml';
import { bookmarksFile } from './config';
import { createMutex } from './mutex';

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

export interface AddResult {
	bookmark: Bookmark;
	created: boolean;
}

/** Add a bookmark. If the URL already exists, returns the existing one (created:false). */
export function addBookmark(input: NewBookmark): Promise<AddResult> {
	return transact<AddResult>((list) => {
		const url = normalizeUrl(input.url);
		if (!url) throw new Error('A URL is required.');

		const existing = list.find((b) => b.url === url);
		if (existing) return { result: { bookmark: existing, created: false } };

		const fields = normalizeFields(input);
		const bookmark: Bookmark = {
			url,
			title: fields.title ?? url,
			tags: fields.tags ?? [],
			collection: fields.collection,
			notes: fields.notes,
			added: new Date().toISOString()
		};
		return { next: [bookmark, ...list], result: { bookmark, created: true } };
	});
}

/**
 * Add many bookmarks in a single read-modify-write. URLs already present (in the
 * file or earlier in the batch) are skipped, never overwritten — an import must
 * not clobber notes or tags you've curated here.
 */
export function addBookmarks(items: ImportItem[]): Promise<ImportSummary> {
	return transact((list) => {
		const known = new Set(list.map((b) => b.url));
		const created: Bookmark[] = [];

		for (const item of items) {
			const url = normalizeUrl(item.url);
			if (!url || known.has(url)) continue;
			known.add(url);

			const fields = normalizeFields(item);
			created.push({
				url,
				title: fields.title ?? url,
				tags: fields.tags ?? [],
				collection: fields.collection,
				notes: fields.notes,
				added: item.added ?? new Date().toISOString()
			});
		}

		const summary: ImportSummary = {
			added: created.length,
			skipped: items.length - created.length
		};
		return { next: created.length ? [...created, ...list] : undefined, result: summary };
	});
}

/** Update an existing bookmark identified by its (original) URL. */
export function updateBookmark(originalUrl: string, changes: NewBookmark): Promise<Bookmark> {
	return transact((list) => {
		const idx = list.findIndex((b) => b.url === originalUrl);
		if (idx === -1) throw new Error('Bookmark not found.');

		const current = list[idx];
		const fields = normalizeFields(changes);
		const updated: Bookmark = {
			...current,
			url: normalizeUrl(changes.url) || current.url,
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
