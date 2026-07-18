import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { env } from '$env/dynamic/private';
import type { Bookmark, NewBookmark, PageMetadata } from '$lib/types';
import { parseBookmarks, serializeBookmarks } from './toml';
import { fetchMetadata } from './metadata';

/** Absolute path to bookmarks.toml — overridable via the BOOKMARKS_FILE env var. */
function filePath(): string {
	return env.BOOKMARKS_FILE?.trim() || join(homedir(), '.bookmarks', 'bookmarks.toml');
}

/** Normalize user-entered URLs: trim and ensure a scheme is present. */
export function normalizeUrl(input: string): string {
	const url = input.trim();
	if (!url) return '';
	return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}

// --- write serialization -----------------------------------------------------
// A single in-process chain ensures read-modify-write cycles never interleave.
let lock: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
	const run = lock.then(fn, fn);
	lock = run.then(
		() => undefined,
		() => undefined
	);
	return run;
}

async function readFromDisk(): Promise<Bookmark[]> {
	try {
		return parseBookmarks(await readFile(filePath(), 'utf-8'));
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
		throw err;
	}
}

async function writeToDisk(bookmarks: Bookmark[]): Promise<void> {
	const path = filePath();
	await mkdir(dirname(path), { recursive: true });
	const tmp = `${path}.tmp`;
	await writeFile(tmp, serializeBookmarks(bookmarks), 'utf-8');
	await rename(tmp, path); // atomic replace
}

/** Read all bookmarks, newest first. Reads fresh from disk every time. */
export async function readBookmarks(): Promise<Bookmark[]> {
	const list = await readFromDisk();
	return list.sort((a, b) => b.added.localeCompare(a.added));
}

export interface AddResult {
	bookmark: Bookmark;
	created: boolean;
}

/** Add a bookmark. If the URL already exists, returns the existing one (created:false). */
export function addBookmark(input: NewBookmark): Promise<AddResult> {
	return withLock(async () => {
		const url = normalizeUrl(input.url);
		if (!url) throw new Error('A URL is required.');

		const list = await readFromDisk();
		const existing = list.find((b) => b.url === url);
		if (existing) return { bookmark: existing, created: false };

		const bookmark: Bookmark = {
			url,
			title: input.title?.trim() || url,
			tags: input.tags?.map((t) => t.trim()).filter(Boolean) ?? [],
			collection: input.collection?.trim() || undefined,
			notes: input.notes?.trim() || undefined,
			added: new Date().toISOString()
		};
		await writeToDisk([bookmark, ...list]);
		return { bookmark, created: true };
	});
}

/** Update an existing bookmark identified by its (original) URL. */
export function updateBookmark(originalUrl: string, changes: NewBookmark): Promise<Bookmark> {
	return withLock(async () => {
		const list = await readFromDisk();
		const idx = list.findIndex((b) => b.url === originalUrl);
		if (idx === -1) throw new Error('Bookmark not found.');

		const current = list[idx];
		const updated: Bookmark = {
			...current,
			url: normalizeUrl(changes.url) || current.url,
			title: changes.title?.trim() || current.title,
			tags: changes.tags?.map((t) => t.trim()).filter(Boolean) ?? current.tags,
			collection: changes.collection?.trim() || undefined,
			notes: changes.notes?.trim() || undefined
		};
		list[idx] = updated;
		await writeToDisk(list);
		return updated;
	});
}

/** Delete a bookmark by URL. No-op if it doesn't exist. */
export function deleteBookmark(url: string): Promise<void> {
	return withLock(async () => {
		const list = await readFromDisk();
		const next = list.filter((b) => b.url !== url);
		if (next.length !== list.length) await writeToDisk(next);
	});
}

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

/** Fetch metadata for a URL and write it back. Safe to call in the background. */
export function refreshMetadata(url: string): Promise<Bookmark | null> {
	return withLock(async () => {
		const list = await readFromDisk();
		const idx = list.findIndex((b) => b.url === url);
		if (idx === -1) return null;
		const meta = await fetchMetadata(url);
		const updated = applyMetadata(list[idx], meta);
		list[idx] = updated;
		await writeToDisk(list);
		return updated;
	});
}

// URLs whose metadata is currently being fetched in the background. Exposed to the
// client so it can show a "fetching…" state and poll until enrichment finishes.
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
