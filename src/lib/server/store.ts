import { dirname } from 'node:path';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import type { Bookmark } from '$lib/types';
import { parseBookmarks, serializeBookmarks } from './toml';
import { bookmarksFile } from './config';
import { createMutex } from './mutex';

/**
 * Persistence for the bookmarks file: reading it, writing it atomically, and
 * serializing the read-modify-write cycle. Knows nothing about what a bookmark
 * means — that belongs to the repository.
 */

const lock = createMutex();

/** Read and parse the file. A missing file is an empty library, not an error. */
export async function readFromDisk(): Promise<Bookmark[]> {
	try {
		return parseBookmarks(await readFile(bookmarksFile(), 'utf-8'));
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
		throw err;
	}
}

/** Write via a temp file and rename, so a crash cannot leave a half-written library. */
export async function writeToDisk(bookmarks: Bookmark[]): Promise<void> {
	const path = bookmarksFile();
	await mkdir(dirname(path), { recursive: true });
	const temp = `${path}.tmp`;
	await writeFile(temp, serializeBookmarks(bookmarks), 'utf-8');
	await rename(temp, path); // atomic replace
}

/**
 * Run a read-modify-write transaction under the write lock. The mutator receives the
 * current list and returns the `next` list to persist (omit it to skip writing) plus
 * a `result` to hand back to the caller.
 */
export function transact<T>(
	mutate: (list: Bookmark[]) => { next?: Bookmark[]; result: T }
): Promise<T> {
	return lock(async () => {
		const list = await readFromDisk();
		const { next, result } = mutate(list);
		if (next) await writeToDisk(next);
		return result;
	});
}
