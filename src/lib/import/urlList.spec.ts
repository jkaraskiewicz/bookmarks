import { describe, it, expect } from 'vitest';
import { parseUrlList } from './urlList';

describe('parseUrlList', () => {
	it('reads one URL per line', () => {
		const out = parseUrlList('https://a.dev\nhttps://b.dev');
		expect(out.map((i) => i.url)).toEqual(['https://a.dev', 'https://b.dev']);
	});

	it('takes the rest of the line as a title', () => {
		const [item] = parseUrlList('https://svelte.dev   Svelte docs');
		expect(item.title).toBe('Svelte docs');
	});

	it('adds a scheme to bare hosts', () => {
		const [item] = parseUrlList('svelte.dev');
		expect(item.url).toBe('https://svelte.dev');
	});

	it('ignores blank lines and # comments', () => {
		expect(parseUrlList('\n# tabs from work\n\nhttps://a.dev\n')).toHaveLength(1);
	});

	it('drops non-http entries', () => {
		expect(parseUrlList('chrome://settings\nfile:///tmp/x')).toEqual([]);
	});

	it('handles CRLF line endings', () => {
		expect(parseUrlList('https://a.dev\r\nhttps://b.dev')).toHaveLength(2);
	});
});
