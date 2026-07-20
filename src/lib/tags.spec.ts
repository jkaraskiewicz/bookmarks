import { describe, it, expect } from 'vitest';
import { splitList, splitTagsForRow, TAG_ROW_BUDGET } from './tags';

describe('splitTagsForRow', () => {
	it('shows every tag when they fit the budget', () => {
		const tags = ['svelte', 'docs', 'web', 'ui'];
		expect(splitTagsForRow(tags)).toEqual({ visible: tags, hidden: [] });
	});

	it('fits more short tags than long ones', () => {
		const short = splitTagsForRow(['a', 'b', 'c', 'd', 'e', 'f']);
		const long = splitTagsForRow(['infrastructure-as-code', 'continuous-integration']);
		expect(short.visible.length).toBeGreaterThan(long.visible.length);
	});

	it('collapses the tail once the budget is spent', () => {
		expect(splitTagsForRow(['aaaaaaaaaa', 'bbbbbbbbbb', 'cccccccccc', 'dddddddddd'])).toEqual({
			visible: ['aaaaaaaaaa', 'bbbbbbbbbb'],
			hidden: ['cccccccccc', 'dddddddddd']
		});
	});

	it('charges each chip for its padding, not just its text', () => {
		// Nine characters of tag text, but nine chips' worth of padding with it.
		expect(splitTagsForRow(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'], 12).visible).toEqual([
			'a',
			'b',
			'c'
		]);
	});

	it('always shows the first tag, even when it alone blows the budget', () => {
		const huge = 'x'.repeat(TAG_ROW_BUDGET * 2);
		expect(splitTagsForRow([huge, 'docs'])).toEqual({ visible: [huge], hidden: ['docs'] });
	});

	it('never drops or reorders a tag', () => {
		const many = Array.from({ length: 20 }, (_, i) => `tag-number-${i}`);
		const { visible, hidden } = splitTagsForRow(many);
		expect([...visible, ...hidden]).toEqual(many);
	});

	it('accepts a custom budget', () => {
		expect(splitTagsForRow(['ab', 'cd', 'ef'], 5)).toEqual({
			visible: ['ab'],
			hidden: ['cd', 'ef']
		});
	});

	it('handles an empty list', () => {
		expect(splitTagsForRow([])).toEqual({ visible: [], hidden: [] });
	});
});

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
