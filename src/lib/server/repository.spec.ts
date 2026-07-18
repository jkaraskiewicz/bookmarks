import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Point the repository at a throwaway file per test run, before importing it.
const dir = await mkdtemp(join(tmpdir(), 'bookmarks-repo-'));
const file = join(dir, 'bookmarks.toml');
vi.mock('./config', () => ({ bookmarksFile: () => file }));

const {
	readBookmarks,
	addBookmark,
	addBookmarks,
	updateBookmark,
	deleteBookmark,
	mergeIntoBookmark,
	transformBookmark
} = await import('./repository');
const { DomainError } = await import('./errors');

beforeEach(() => writeFile(file, ''));
afterAll(() => rm(dir, { recursive: true, force: true }));

describe('addBookmark', () => {
	it('stores a bookmark and reports it as created', async () => {
		const { bookmark, created } = await addBookmark({ url: 'https://svelte.dev' });
		expect(created).toBe(true);
		expect(bookmark.url).toBe('https://svelte.dev');
		expect(await readBookmarks()).toHaveLength(1);
	});

	it('adds a missing scheme', async () => {
		const { bookmark } = await addBookmark({ url: 'svelte.dev' });
		expect(bookmark.url).toBe('https://svelte.dev');
	});

	it('falls back to the URL as the title', async () => {
		const { bookmark } = await addBookmark({ url: 'https://svelte.dev' });
		expect(bookmark.title).toBe('https://svelte.dev');
	});

	it('trims fields and drops blank tags', async () => {
		const { bookmark } = await addBookmark({
			url: 'https://svelte.dev',
			title: '  Svelte  ',
			tags: ['  docs ', '', '  '],
			collection: ' Dev ',
			notes: '  '
		});
		expect(bookmark.title).toBe('Svelte');
		expect(bookmark.tags).toEqual(['docs']);
		expect(bookmark.collection).toBe('Dev');
		expect(bookmark.notes).toBeUndefined();
	});

	it('rejects an empty URL', async () => {
		await expect(addBookmark({ url: '   ' })).rejects.toBeInstanceOf(DomainError);
	});

	it('refuses a certain duplicate and returns the existing bookmark', async () => {
		await addBookmark({ url: 'https://svelte.dev/docs', title: 'Docs' });
		const result = await addBookmark({ url: 'https://SVELTE.dev/docs?utm_source=x#intro' });

		expect(result.created).toBe(false);
		expect(result.duplicate).toBe('exact');
		expect(result.bookmark.title).toBe('Docs');
		expect(await readBookmarks()).toHaveLength(1);
	});

	it('refuses a probable duplicate, but allows it when forced', async () => {
		await addBookmark({ url: 'https://www.nba.com/news' });

		const refused = await addBookmark({ url: 'http://nba.com/news/' });
		expect(refused.created).toBe(false);
		expect(refused.duplicate).toBe('similar');
		expect(await readBookmarks()).toHaveLength(1);

		const forced = await addBookmark({ url: 'http://nba.com/news/' }, true);
		expect(forced.created).toBe(true);
		expect(await readBookmarks()).toHaveLength(2);
	});
});

describe('readBookmarks', () => {
	it('returns newest first', async () => {
		await addBookmarks([
			{ url: 'https://old.dev', added: '2020-01-01T00:00:00.000Z' },
			{ url: 'https://new.dev', added: '2026-01-01T00:00:00.000Z' }
		]);
		expect((await readBookmarks()).map((b) => b.url)).toEqual([
			'https://new.dev',
			'https://old.dev'
		]);
	});

	it('returns an empty list when the file does not exist', async () => {
		await rm(file, { force: true });
		expect(await readBookmarks()).toEqual([]);
	});

	it('reflects edits made to the file by hand', async () => {
		await writeFile(file, '[[bookmark]]\nurl = "https://hand.dev"\n');
		expect((await readBookmarks()).map((b) => b.url)).toEqual(['https://hand.dev']);
	});
});

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

describe('updateBookmark', () => {
	it('applies changes and keeps the original added date', async () => {
		const { bookmark } = await addBookmark({ url: 'https://a.dev', title: 'A' });
		const updated = await updateBookmark('https://a.dev', {
			url: 'https://a.dev',
			title: 'Renamed',
			tags: ['x']
		});

		expect(updated.title).toBe('Renamed');
		expect(updated.tags).toEqual(['x']);
		expect(updated.added).toBe(bookmark.added);
	});

	it('can change the URL', async () => {
		await addBookmark({ url: 'https://a.dev' });
		const updated = await updateBookmark('https://a.dev', { url: 'https://b.dev' });
		expect(updated.url).toBe('https://b.dev');
	});

	it('refuses a URL another bookmark already uses', async () => {
		await addBookmark({ url: 'https://a.dev' });
		await addBookmark({ url: 'https://b.dev' });

		await expect(updateBookmark('https://a.dev', { url: 'https://b.dev' })).rejects.toBeInstanceOf(
			DomainError
		);
		expect(await readBookmarks()).toHaveLength(2);
	});

	it('does not treat the bookmark as its own duplicate', async () => {
		await addBookmark({ url: 'https://a.dev', title: 'A' });
		const updated = await updateBookmark('https://a.dev', { url: 'https://a.dev', title: 'B' });
		expect(updated.title).toBe('B');
	});

	it('rejects an unknown bookmark', async () => {
		await expect(
			updateBookmark('https://nope.dev', { url: 'https://x.dev' })
		).rejects.toBeInstanceOf(DomainError);
	});
});

describe('mergeIntoBookmark', () => {
	it('unions tags and appends notes', async () => {
		await addBookmark({ url: 'https://a.dev', tags: ['one'], notes: 'first' });
		const merged = await mergeIntoBookmark('https://a.dev', {
			url: 'https://a.dev',
			tags: ['one', 'two'],
			notes: 'second'
		});

		expect(merged?.tags).toEqual(['one', 'two']);
		expect(merged?.notes).toBe('first\nsecond');
	});

	it('returns null for an unknown bookmark', async () => {
		expect(await mergeIntoBookmark('https://nope.dev', { url: 'https://nope.dev' })).toBeNull();
	});
});

describe('deleteBookmark', () => {
	it('removes a bookmark', async () => {
		await addBookmark({ url: 'https://a.dev' });
		await deleteBookmark('https://a.dev');
		expect(await readBookmarks()).toEqual([]);
	});

	it('is a no-op for an unknown URL', async () => {
		await addBookmark({ url: 'https://a.dev' });
		await deleteBookmark('https://nope.dev');
		expect(await readBookmarks()).toHaveLength(1);
	});
});

describe('transformBookmark', () => {
	it('applies a transformation', async () => {
		await addBookmark({ url: 'https://a.dev' });
		const updated = await transformBookmark('https://a.dev', (b) => ({ ...b, favicon: 'i.png' }));
		expect(updated?.favicon).toBe('i.png');
	});

	it('returns null when the bookmark is gone', async () => {
		expect(await transformBookmark('https://nope.dev', (b) => b)).toBeNull();
	});
});

describe('concurrent writes', () => {
	it('serializes overlapping adds so none are lost', async () => {
		await Promise.all(
			Array.from({ length: 10 }, (_, i) => addBookmark({ url: `https://site-${i}.dev` }))
		);
		expect(await readBookmarks()).toHaveLength(10);
	});
});
