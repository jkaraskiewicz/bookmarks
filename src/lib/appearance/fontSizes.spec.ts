import { describe, it, expect } from 'vitest';
import { DEFAULT_FONT_SIZE, FONT_SIZES, fontScale, toFontSizeId } from './fontSizes';

describe('the size list', () => {
	it('offers the default, and the default is unscaled', () => {
		expect(FONT_SIZES.map((size) => size.id)).toContain(DEFAULT_FONT_SIZE);
		expect(fontScale(DEFAULT_FONT_SIZE)).toBe('100%');
	});

	it('runs from smallest to largest', () => {
		// The picker lists them in this order; out of order would read as a bug.
		const scales = FONT_SIZES.map((size) => parseFloat(size.scale));
		expect(scales).toEqual([...scales].sort((a, b) => a - b));
	});

	it('expresses every size relative to the browser default', () => {
		// A pixel count would override someone who has already raised theirs.
		for (const size of FONT_SIZES) {
			expect(size.scale, `${size.id} is not relative`).toMatch(/%$/);
		}
	});
});

describe('toFontSizeId', () => {
	it('keeps a size the build offers', () => {
		expect(toFontSizeId('large')).toBe('large');
	});

	it('falls back for anything else', () => {
		expect(toFontSizeId('enormous')).toBe(DEFAULT_FONT_SIZE);
		expect(toFontSizeId(undefined)).toBe(DEFAULT_FONT_SIZE);
	});
});
