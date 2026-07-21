import { describe, it, expect } from 'vitest';
import { conventionalFavicon } from './favicon';

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
