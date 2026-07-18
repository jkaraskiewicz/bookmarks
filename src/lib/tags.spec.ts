import { describe, it, expect } from 'vitest';
import { splitList } from './tags';

describe('splitList', () => {
	it('splits on commas and trims', () => {
		expect(splitList('frontend, docs ,  ')).toEqual(['frontend', 'docs']);
	});

	it('splits on newlines too', () => {
		expect(splitList('a\nb, c')).toEqual(['a', 'b', 'c']);
	});

	it('accepts a custom separator', () => {
		expect(splitList('a,b', /,/)).toEqual(['a', 'b']);
	});

	it('returns an empty list for empty or non-string input', () => {
		expect(splitList('')).toEqual([]);
		expect(splitList(null)).toEqual([]);
		expect(splitList(undefined)).toEqual([]);
	});
});
