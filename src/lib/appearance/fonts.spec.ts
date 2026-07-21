import { describe, it, expect } from 'vitest';
import { DEFAULT_FONT, FONTS, fontStack, toFontId } from './fonts';

describe('the font list', () => {
	it('offers the default', () => {
		expect(FONTS.map((font) => font.id)).toContain(DEFAULT_FONT);
	});

	it('names every font once', () => {
		expect(new Set(FONTS.map((font) => font.id)).size).toBe(FONTS.length);
		expect(new Set(FONTS.map((font) => font.label)).size).toBe(FONTS.length);
	});

	it('ends every stack in a generic family', () => {
		// No webfonts are downloaded, so a machine without the named face has to have
		// somewhere to fall to — otherwise the choice silently does nothing.
		for (const font of FONTS) {
			expect(font.stack, `${font.id} has no generic fallback`).toMatch(
				/(sans-serif|serif|monospace|cursive|fantasy)$/
			);
		}
	});

	it('quotes any family whose name has a space in it', () => {
		// An unquoted `Segoe UI` is not a parse error — the browser drops that entry
		// and silently uses the next one, so the picker would show a font nobody gets.
		expect(unquotedMultiWordFamilies(FONTS.map((font) => font.stack))).toEqual([]);
	});
});

/** Families of more than one word that are not wrapped in quotes. */
function unquotedMultiWordFamilies(stacks: readonly string[]): string[] {
	return stacks
		.flatMap((stack) => stack.split(',').map((part) => part.trim()))
		.filter((family) => family.includes(' ') && !family.startsWith('"'));
}

describe('unquotedMultiWordFamilies', () => {
	it('catches an unquoted family, so the check above cannot pass vacuously', () => {
		expect(unquotedMultiWordFamilies(['Segoe UI, sans-serif'])).toEqual(['Segoe UI']);
	});
});

describe('toFontId', () => {
	it('keeps a font the build offers', () => {
		expect(toFontId('georgia')).toBe('georgia');
	});

	it('falls back for anything else', () => {
		expect(toFontId('comic-sans')).toBe(DEFAULT_FONT);
		expect(toFontId(null)).toBe(DEFAULT_FONT);
	});
});

describe('fontStack', () => {
	it('gives the stack for a font', () => {
		expect(fontStack('mono')).toContain('monospace');
	});
});
