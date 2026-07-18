import { describe, it, expect } from 'vitest';
import { hostname } from './url';

describe('hostname', () => {
	it('returns the host without a leading www.', () => {
		expect(hostname('https://www.example.com/path?q=1')).toBe('example.com');
		expect(hostname('https://news.ycombinator.com')).toBe('news.ycombinator.com');
	});

	it('falls back to the raw input for an unparseable URL', () => {
		expect(hostname('not a url')).toBe('not a url');
	});
});
