import { describe, it, expect, vi, afterEach } from 'vitest';
import { extractMetadata, conventionalFavicon, fetchMetadata } from './metadata';

const base = 'https://example.com/page';

describe('extractMetadata', () => {
	it('reads <title>, meta description and a relative favicon', () => {
		const html = `<html><head>
			<title>My &amp; Site</title>
			<meta name="description" content="Hello &quot;world&quot;">
			<link rel="icon" href="/icon.png">
		</head><body></body></html>`;
		expect(extractMetadata(html, base)).toEqual({
			title: 'My & Site',
			description: 'Hello "world"',
			favicon: 'https://example.com/icon.png'
		});
	});

	it('prefers OpenGraph tags over <title>/description', () => {
		const html = `<head>
			<title>fallback</title>
			<meta property="og:title" content="OG Title">
			<meta property="og:description" content="OG Desc">
		</head>`;
		const meta = extractMetadata(html, base);
		expect(meta.title).toBe('OG Title');
		expect(meta.description).toBe('OG Desc');
	});

	it('falls back to /favicon.ico when no icon link is present', () => {
		const meta = extractMetadata('<head><title>x</title></head>', base);
		expect(meta.favicon).toBe('https://example.com/favicon.ico');
	});

	it('treats an empty data-URI placeholder as no favicon', () => {
		const html = '<head><link rel="icon" href="data:,"></head>';
		expect(extractMetadata(html, base).favicon).toBeUndefined();
	});

	it('prefers a standard rel="icon" over fluid-icon / apple-touch-icon', () => {
		const html = `<head>
			<link rel="fluid-icon" href="/fluid.png">
			<link rel="apple-touch-icon" href="/apple.png">
			<link rel="icon" href="/favicon-32.png">
		</head>`;
		expect(extractMetadata(html, base).favicon).toBe('https://example.com/favicon-32.png');
	});
});

describe('conventionalFavicon', () => {
	it('points at the host root regardless of the page path', () => {
		expect(conventionalFavicon('https://docs.google.com/document/d/abc/edit?tab=t.0')).toBe(
			'https://docs.google.com/favicon.ico'
		);
	});

	it('keeps a non-default port', () => {
		expect(conventionalFavicon('http://localhost:3000/x')).toBe(
			'http://localhost:3000/favicon.ico'
		);
	});

	it('gives nothing for an unparseable URL', () => {
		expect(conventionalFavicon('not a url')).toBeUndefined();
	});
});

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
