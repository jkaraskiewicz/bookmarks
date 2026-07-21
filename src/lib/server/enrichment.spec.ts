import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = await mkdtemp(join(tmpdir(), 'bookmarks-enrich-'));
const file = join(dir, 'bookmarks.toml');
vi.mock('./config', () => ({ bookmarksFile: () => file }));

const { refreshMetadata } = await import('./enrichment');
const { addBookmark, transformBookmark, readBookmarks } = await import('./repository');

beforeEach(() => writeFile(file, ''));
afterAll(() => rm(dir, { recursive: true, force: true }));

/** Answer the next fetch with a page declaring nothing but its own title. */
function respondWith(body: string, init: { status?: number; type?: string } = {}) {
	vi.spyOn(globalThis, 'fetch').mockResolvedValue(
		new Response(body, {
			status: init.status ?? 200,
			headers: { 'content-type': init.type ?? 'text/html' }
		})
	);
}

const URL_UNDER_TEST = 'https://intranet.test/page';

describe('refreshMetadata and a hand-set favicon', () => {
	it('keeps an icon that was typed in, even when the fetch guesses another', async () => {
		// The case this exists for: an internal site the fetcher cannot read, so it
		// offers the conventional /favicon.ico — which is exactly the broken one the
		// user replaced by hand. A refresh must not put it back.
		await addBookmark({ url: URL_UNDER_TEST });
		await transformBookmark(URL_UNDER_TEST, (bookmark) => ({
			...bookmark,
			favicon: 'https://cdn.test/our-logo.png'
		}));

		respondWith('', { status: 401 });
		const refreshed = await refreshMetadata(URL_UNDER_TEST);

		expect(refreshed?.favicon).toBe('https://cdn.test/our-logo.png');
		vi.restoreAllMocks();
	});

	it('fills an empty icon, so clearing the field asks for a fresh one', async () => {
		await addBookmark({ url: URL_UNDER_TEST });

		respondWith('<head><link rel="icon" href="/real.png"></head>');
		const refreshed = await refreshMetadata(URL_UNDER_TEST);

		expect(refreshed?.favicon).toBe('https://intranet.test/real.png');
		vi.restoreAllMocks();
	});

	it('replaces its own earlier guess with an icon the page declares', async () => {
		await addBookmark({ url: URL_UNDER_TEST });
		await transformBookmark(URL_UNDER_TEST, (bookmark) => ({
			...bookmark,
			favicon: 'https://intranet.test/favicon.ico'
		}));

		respondWith('<head><link rel="icon" href="/declared.png"></head>');
		const refreshed = await refreshMetadata(URL_UNDER_TEST);

		expect(refreshed?.favicon).toBe('https://intranet.test/declared.png');
		vi.restoreAllMocks();
	});

	it('leaves a typed title and adopted notes alone', async () => {
		await addBookmark({ url: URL_UNDER_TEST, title: 'Our wiki', notes: 'Mine.' });

		respondWith('<head><title>Sign in</title></head>');
		const refreshed = await refreshMetadata(URL_UNDER_TEST);

		expect(refreshed?.title).toBe('Our wiki');
		expect(refreshed?.notes).toBe('Mine.');
		expect((await readBookmarks())[0].title).toBe('Our wiki');
		vi.restoreAllMocks();
	});
});
