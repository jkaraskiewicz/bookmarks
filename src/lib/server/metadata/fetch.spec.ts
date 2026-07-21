import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchMetadata } from './fetch';

describe('fetchMetadata — pages that cannot be read', () => {
	const respond = (init: { status?: number; type?: string; body?: string }) =>
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(init.body ?? '', {
				status: init.status ?? 200,
				headers: { 'content-type': init.type ?? 'text/html' }
			})
		);

	afterEach(() => vi.restoreAllMocks());

	it('still offers the site icon when the page is private', async () => {
		// The case that prompted this: Google Docs answers 401 with no metadata at all,
		// but its favicon is public. A grey square is a worse answer than the real icon.
		respond({ status: 401, body: '<html><head></head></html>' });

		const meta = await fetchMetadata('https://docs.google.com/document/d/abc/edit');
		expect(meta.favicon).toBe('https://docs.google.com/favicon.ico');
		expect(meta.title).toBeUndefined();
		expect(meta.description).toBeUndefined();
	});

	it('still offers the site icon for a non-HTML page', async () => {
		respond({ type: 'application/pdf', body: '%PDF-1.4' });

		const meta = await fetchMetadata('https://example.com/paper.pdf');
		expect(meta.favicon).toBe('https://example.com/favicon.ico');
	});

	it('offers nothing when the request never got a response', async () => {
		// No evidence the host exists, so guessing at an icon for it is pointless.
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ENOTFOUND'));

		expect(await fetchMetadata('https://does-not-resolve.invalid/x')).toEqual({});
	});

	it('prefers what the page declares when it can be read', async () => {
		respond({
			body: '<html><head><title>Real</title><link rel="icon" href="/i.png"></head></html>'
		});

		const meta = await fetchMetadata('https://example.com/page');
		expect(meta.title).toBe('Real');
		expect(meta.favicon).toBe('https://example.com/i.png');
	});
});
