import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Point the repository at a throwaway file per test run, before importing it.
const dir = await mkdtemp(join(tmpdir(), 'bookmarks-repo-'));
const file = join(dir, 'bookmarks.toml');
vi.mock('../config', () => ({ bookmarksFile: () => file }));

const { addBookmark, addBookmarks, readBookmarks } = await import('./index');

beforeEach(() => writeFile(file, ''));
afterAll(() => rm(dir, { recursive: true, force: true }));

describe('addBookmarks', () => {
	it('adds many in one pass and preserves supplied dates', async () => {
		const summary = await addBookmarks([
			{ url: 'https://a.dev', added: '2021-05-05T00:00:00.000Z' },
			{ url: 'https://b.dev' }
		]);

		expect(summary.added).toBe(2);
		expect(summary.skipped).toBe(0);
		const stored = await readBookmarks();
		expect(stored.find((b) => b.url === 'https://a.dev')?.added).toBe('2021-05-05T00:00:00.000Z');
	});

	it('skips URLs already present without overwriting them', async () => {
		await addBookmark({ url: 'https://a.dev', tags: ['mine'], notes: 'kept' });
		const summary = await addBookmarks([{ url: 'https://a.dev', tags: ['theirs'] }]);

		expect(summary).toMatchObject({ added: 0, skipped: 1 });
		const [stored] = await readBookmarks();
		expect(stored.tags).toEqual(['mine']);
		expect(stored.notes).toBe('kept');
	});

	it('reports probable duplicates but still imports them', async () => {
		await addBookmark({ url: 'https://www.a.dev/x' });
		const summary = await addBookmarks([{ url: 'http://a.dev/x/' }]);

		expect(summary.added).toBe(1);
		expect(summary.possibleDuplicates).toEqual([
			{ url: 'http://a.dev/x/', existing: 'https://www.a.dev/x' }
		]);
	});

	it('leaves the file untouched when nothing is added', async () => {
		await addBookmark({ url: 'https://a.dev' });
		const before = await readFile(file, 'utf-8');
		await addBookmarks([{ url: 'https://a.dev' }]);
		expect(await readFile(file, 'utf-8')).toBe(before);
	});
});
