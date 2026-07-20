import { describe, it, expect } from 'vitest';
import { composite, contrastRatio } from './contrast';
import { readPalettes, resolveToken } from './palettes';
import { THEMES } from './index';

/**
 * Every theme must be legible. This reads `palettes.css` directly, so a theme added
 * later is checked automatically — the guarantee travels with the abstraction rather
 * than relying on whoever adds the theme to remember.
 */

/** WCAG AA: 4.5:1 for body text, 3:1 for large text and interface furniture. */
const AA_TEXT = 4.5;
const AA_LARGE = 3;

/** Pairs that must stay readable, and the bar each has to clear. */
const REQUIRED: { text: string; on: string; min: number }[] = [
	{ text: 'content', on: 'canvas', min: AA_TEXT },
	{ text: 'secondary', on: 'canvas', min: AA_TEXT },
	{ text: 'muted', on: 'canvas', min: AA_TEXT },
	{ text: 'faint', on: 'canvas', min: AA_TEXT },
	{ text: 'content', on: 'surface', min: AA_TEXT },
	{ text: 'muted', on: 'surface', min: AA_TEXT },
	{ text: 'content', on: 'elevated', min: AA_TEXT },
	// Placeholder text sits on input backgrounds.
	{ text: 'faint', on: 'elevated', min: AA_TEXT },
	{ text: 'content', on: 'muted-surface', min: AA_TEXT },
	{ text: 'on-accent', on: 'accent', min: AA_TEXT },
	{ text: 'accent-content', on: 'canvas', min: AA_TEXT },
	{ text: 'warning', on: 'warning-surface', min: AA_TEXT },
	{ text: 'success', on: 'success-surface', min: AA_TEXT },
	{ text: 'danger', on: 'canvas', min: AA_LARGE },
	// The bulk-delete button fills with `danger`. Missing from this list, it shipped
	// at 2.9:1 in dark and 2.8:1 in Darcula — white on a light red.
	{ text: 'on-danger', on: 'danger', min: AA_TEXT },
	// Hub pills carry white text on a saturated fill.
	{ text: 'on-accent', on: 'collection', min: AA_LARGE },
	{ text: 'on-accent', on: 'tag', min: AA_LARGE }
];

const palettes = readPalettes();
const WHITE = { r: 255, g: 255, b: 255, a: 1 };

describe('every theme is legible', () => {
	it('styles exactly the themes the app offers', () => {
		// A theme registered but not styled falls back to the block above it; a theme
		// styled but not registered is unreachable. Either way, a bug.
		expect([...palettes.keys()].sort()).toEqual(THEMES.map((entry) => entry.id).sort());
	});

	for (const [name, palette] of palettes) {
		describe(name, () => {
			const canvas = resolveToken(palette.values.get('canvas')!, palette, WHITE);

			for (const { text, on, min } of REQUIRED) {
				it(`${text} on ${on} clears ${min}:1`, () => {
					const background = resolveToken(palette.values.get(on)!, palette, canvas);
					const foreground = composite(
						resolveToken(palette.values.get(text)!, palette, background),
						background
					);
					const ratio = contrastRatio(foreground, background);

					expect(
						ratio,
						`${name}: --${text} on --${on} is ${ratio.toFixed(2)}:1, below ${min}:1`
					).toBeGreaterThanOrEqual(min);
				});
			}
		});
	}
});

describe('every theme is complete', () => {
	it('declares the same tokens in every theme', () => {
		const [reference] = [...palettes.values()];
		const expected = [...reference.values.keys()].sort();

		for (const [name, palette] of [...palettes.entries()].slice(1)) {
			// A missing token silently inherits from the block above, which is how a
			// theme ends up with one stray colour from another theme in it.
			expect([...palette.values.keys()].sort(), `${name} is missing tokens`).toEqual(expected);
		}
	});

	it('agrees with the registry about being light or dark', () => {
		// `color-scheme` drives scrollbars and native form controls. If it disagrees
		// with the registered `base`, those fight the palette.
		for (const entry of THEMES) {
			expect(
				palettes.get(entry.id)?.colorScheme,
				`${entry.id} declares the wrong color-scheme`
			).toBe(entry.base);
		}
	});
});
