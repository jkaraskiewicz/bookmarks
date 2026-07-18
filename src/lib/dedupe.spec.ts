import { describe, it, expect } from 'vitest';
import { exactKey, similarKey, findDuplicate } from './dedupe';

/** Two URLs the app may merge without asking. */
const same = (a: string, b: string) => expect(exactKey(a)).toBe(exactKey(b));
/** Two URLs the app must keep apart. */
const differ = (a: string, b: string) => expect(exactKey(a)).not.toBe(exactKey(b));

describe('exactKey — certainly the same page', () => {
	it('ignores host and scheme capitalization', () => {
		same('https://NBA.com/news', 'https://nba.com/news');
	});

	it('ignores default ports', () => {
		same('https://nba.com:443/news', 'https://nba.com/news');
		same('http://nba.com:80/news', 'http://nba.com/news');
	});

	it('treats an empty path and a bare slash alike', () => {
		same('https://nba.com', 'https://nba.com/');
	});

	it('ignores decorative fragments', () => {
		same('https://nba.com/news', 'https://nba.com/news#scores');
	});

	it('strips tracking parameters', () => {
		same('https://nba.com/news?utm_source=x&utm_campaign=y', 'https://nba.com/news');
		same('https://nba.com/news?fbclid=abc', 'https://nba.com/news');
	});

	it('ignores query parameter order', () => {
		same('https://nba.com/s?b=2&a=1', 'https://nba.com/s?a=1&b=2');
	});
});

describe('exactKey — must stay distinct', () => {
	it('keeps meaningful query parameters', () => {
		// Regression: these are two different YouTube videos, not one page.
		differ('https://youtube.com/watch?v=Q5cTT0M0YXg', 'https://youtube.com/watch?v=8e3I-PYJNHg');
	});

	it('keeps a tracking param from swallowing a real one', () => {
		differ('https://youtube.com/watch?v=abc&utm_source=x', 'https://youtube.com/watch?v=def');
	});

	it('does not guess about www, scheme or trailing slash', () => {
		differ('https://nba.com', 'https://www.nba.com');
		differ('http://nba.com', 'https://nba.com');
		differ('https://nba.com/news', 'https://nba.com/news/');
	});

	it('keeps route-style fragments, which carry page identity', () => {
		differ('https://app.dev/#/settings', 'https://app.dev/#/profile');
		differ('https://app.dev/#!/a', 'https://app.dev/#!/b');
	});

	it('keeps different paths apart', () => {
		differ('https://nba.com/news', 'https://nba.com/scores');
	});

	it('falls back to plain comparison for unparseable input', () => {
		expect(exactKey('not a url')).toBe('not a url');
		expect(exactKey('  NOT A URL  ')).toBe('not a url');
	});
});

describe('similarKey — probably the same page', () => {
	it('folds www, scheme and trailing slash together', () => {
		const key = similarKey('https://www.nba.com/news/');
		expect(similarKey('http://nba.com/news')).toBe(key);
		expect(similarKey('https://nba.com/news')).toBe(key);
	});

	it('still keeps genuinely different pages apart', () => {
		expect(similarKey('https://nba.com/news')).not.toBe(similarKey('https://nba.com/scores'));
	});
});

describe('findDuplicate', () => {
	const items = [
		{ url: 'https://www.nba.com/news' },
		{ url: 'https://svelte.dev' },
		{ url: 'https://youtube.com/watch?v=abc' }
	];

	it('reports a certain match as exact', () => {
		const found = findDuplicate(items, 'https://www.NBA.com/news?utm_source=x#top');
		expect(found.exact?.url).toBe('https://www.nba.com/news');
		expect(found.similar).toBeUndefined();
	});

	it('reports a probable match as similar, not exact', () => {
		const found = findDuplicate(items, 'http://nba.com/news/');
		expect(found.exact).toBeUndefined();
		expect(found.similar?.url).toBe('https://www.nba.com/news');
	});

	it('reports nothing for a genuinely new URL', () => {
		expect(findDuplicate(items, 'https://vitest.dev')).toEqual({});
	});

	it('prefers an exact match over a similar one', () => {
		const list = [{ url: 'http://nba.com/news/' }, { url: 'https://svelte.dev' }];
		expect(findDuplicate(list, 'https://svelte.dev').exact?.url).toBe('https://svelte.dev');
	});

	it('does not flag a bookmark as a duplicate of itself when editing', () => {
		const found = findDuplicate(items, 'https://www.nba.com/news', 'https://www.nba.com/news');
		expect(found).toEqual({});
	});
});
