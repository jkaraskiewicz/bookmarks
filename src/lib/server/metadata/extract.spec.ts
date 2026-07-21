import { describe, it, expect } from 'vitest';
import { extractMetadata } from './extract';

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
