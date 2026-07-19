import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { composite, contrastRatio, parseColor, type Rgb } from './contrast';

/**
 * Every theme must be legible. This reads `palettes.css` directly, so a theme added
 * later is checked automatically — the guarantee travels with the abstraction rather
 * than relying on whoever adds the theme to remember.
 */

/** WCAG AA: 4.5:1 for body text, 3:1 for large text and interface furniture. */
const AA_TEXT = 4.5;
const AA_LARGE = 3;

/**
 * Tailwind v4's palette, which the themes reference by name. Only the entries the
 * themes actually use. If Tailwind restates its palette, this table goes stale and
 * these tests are how you find out.
 */
const TAILWIND: Record<string, string> = {
	'neutral-50': 'oklch(0.985 0 0)',
	'neutral-100': 'oklch(0.97 0 0)',
	'neutral-200': 'oklch(0.922 0 0)',
	'neutral-300': 'oklch(0.87 0 0)',
	'neutral-400': 'oklch(0.708 0 0)',
	'neutral-500': 'oklch(0.556 0 0)',
	'neutral-600': 'oklch(0.439 0 0)',
	'neutral-700': 'oklch(0.371 0 0)',
	'neutral-800': 'oklch(0.269 0 0)',
	'neutral-900': 'oklch(0.205 0 0)',
	'neutral-950': 'oklch(0.145 0 0)',
	'blue-500': 'oklch(0.623 0.214 259.815)',
	'blue-600': 'oklch(0.546 0.245 262.881)',
	'blue-400': 'oklch(0.707 0.165 254.624)',
	'blue-700': 'oklch(0.488 0.243 264.376)',
	'red-400': 'oklch(0.704 0.191 22.216)',
	'red-600': 'oklch(0.577 0.245 27.325)',
	'amber-50': 'oklch(0.987 0.022 95.277)',
	'amber-300': 'oklch(0.879 0.169 91.605)',
	'amber-800': 'oklch(0.473 0.137 46.201)',
	'amber-950': 'oklch(0.279 0.077 45.635)',
	'green-50': 'oklch(0.982 0.018 155.826)',
	'green-300': 'oklch(0.871 0.15 154.449)',
	'green-800': 'oklch(0.448 0.119 151.328)',
	'green-950': 'oklch(0.266 0.065 152.934)',
	'emerald-600': 'oklch(0.596 0.145 163.225)',
	'emerald-700': 'oklch(0.508 0.118 165.612)',
	'sky-600': 'oklch(0.588 0.158 241.966)',
	'sky-700': 'oklch(0.5 0.134 242.749)'
};

/** Read each `[data-theme=…]` block out of the stylesheet as a name → value map. */
function readPalettes(): Map<string, Map<string, string>> {
	const css = readFileSync(fileURLToPath(new URL('./palettes.css', import.meta.url)), 'utf-8');
	const palettes = new Map<string, Map<string, string>>();

	for (const block of css.split('}')) {
		const selector = block.slice(0, block.indexOf('{'));
		const body = block.slice(block.indexOf('{') + 1);
		if (!selector.includes('data-theme')) continue;

		const name = /data-theme='([^']+)'/.exec(selector)?.[1];
		if (!name) continue;

		const values = new Map<string, string>();
		for (const line of body.split('\n')) {
			const declaration = /^\s*--([\w-]+):\s*([^;]+);/.exec(line);
			if (declaration) values.set(declaration[1], declaration[2].trim());
		}
		palettes.set(name, values);
	}

	return palettes;
}

/** Resolve a token to a colour, following `var(--color-…)` and `color-mix(…)`. */
function resolve(value: string, palette: Map<string, string>, onto: Rgb): Rgb {
	const mix = /^color-mix\(in oklab,\s*(.+?)\s+(\d+)%,\s*(.+?)\)$/.exec(value);
	if (mix) {
		const [, colour, percent, other] = mix;
		const base = resolve(colour, palette, onto);
		const share = Number(percent) / 100;
		// The themes only ever mix toward `transparent`, i.e. reduce alpha.
		if (other.trim() === 'transparent') return composite({ ...base, a: base.a * share }, onto);
		return composite({ ...base, a: share }, resolve(other, palette, onto));
	}

	const variable = /^var\(--([\w-]+)\)$/.exec(value);
	if (variable) {
		const name = variable[1];
		const tailwind = name.startsWith('color-') ? TAILWIND[name.slice('color-'.length)] : undefined;
		if (tailwind) return parseColor(tailwind);
		const own = palette.get(name);
		if (own) return resolve(own, palette, onto);
		throw new Error(`Unknown variable: --${name}`);
	}

	return parseColor(value);
}

/** Pairs that must stay readable, and the bar each has to clear. */
const REQUIRED: { text: string; on: string; min: number }[] = [
	{ text: 'content', on: 'canvas', min: AA_TEXT },
	{ text: 'secondary', on: 'canvas', min: AA_TEXT },
	{ text: 'muted', on: 'canvas', min: AA_TEXT },
	{ text: 'faint', on: 'canvas', min: AA_TEXT },
	{ text: 'content', on: 'elevated', min: AA_TEXT },
	{ text: 'muted', on: 'surface', min: AA_TEXT },
	{ text: 'content', on: 'muted-surface', min: AA_TEXT },
	{ text: 'on-accent', on: 'accent', min: AA_TEXT },
	{ text: 'accent-content', on: 'canvas', min: AA_TEXT },
	{ text: 'warning', on: 'warning-surface', min: AA_TEXT },
	{ text: 'success', on: 'success-surface', min: AA_TEXT },
	{ text: 'danger', on: 'canvas', min: AA_LARGE },
	// Hub pills carry white text on a saturated fill.
	{ text: 'on-accent', on: 'collection', min: AA_LARGE },
	{ text: 'on-accent', on: 'tag', min: AA_LARGE }
];

const palettes = readPalettes();

describe('every theme is legible', () => {
	it('finds the themes declared in palettes.css', () => {
		expect([...palettes.keys()].sort()).toEqual(['dark', 'light']);
	});

	for (const [name, palette] of palettes) {
		describe(name, () => {
			const canvas = resolve(palette.get('canvas')!, palette, { r: 255, g: 255, b: 255, a: 1 });

			for (const { text, on, min } of REQUIRED) {
				it(`${text} on ${on} clears ${min}:1`, () => {
					const background = resolve(palette.get(on)!, palette, canvas);
					const foreground = composite(
						resolve(palette.get(text)!, palette, background),
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
		const [reference, ...others] = [...palettes.values()];
		const expected = [...reference.keys()].sort();

		for (const [name, palette] of [...palettes.entries()].slice(1)) {
			// A missing token silently inherits from the block above, which is how a
			// theme ends up with one stray colour from another theme in it.
			expect([...palette.keys()].sort(), `${name} is missing tokens`).toEqual(expected);
		}
		expect(others.length).toBeGreaterThan(0);
	});
});
