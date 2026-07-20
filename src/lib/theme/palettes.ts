import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { composite, parseColor, type Rgb } from './contrast';

/**
 * Reads the theme stylesheets so tests can check the themes they declare.
 *
 * They are the source of truth for what a theme looks like, so the checks read them
 * rather than a copy — a theme added later is covered without anyone remembering to
 * register it here.
 *
 * Node-only: used by tests, not shipped to the browser.
 */

export interface Palette {
	/** Custom property name (without `--`) → declared value. */
	values: Map<string, string>;
	/** The `color-scheme` the block declares, which browsers use for scrollbars etc. */
	colorScheme?: string;
}

/**
 * Tailwind v4's palette, which themes may reference by name. Only the entries in use.
 * If Tailwind restates its palette this goes stale, and the contrast tests say so.
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
	'blue-400': 'oklch(0.707 0.165 254.624)',
	'blue-500': 'oklch(0.623 0.214 259.815)',
	'blue-600': 'oklch(0.546 0.245 262.881)',
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

/**
 * The theme stylesheets, in the order `palettes.css` imports them.
 *
 * Following the imports rather than listing the directory is deliberate: a file that
 * exists but is never imported is dead, and should not be reported as a theme.
 */
function themeStylesheets(): string {
	const index = new URL('./palettes.css', import.meta.url);
	const css = readFileSync(fileURLToPath(index), 'utf-8');
	const imports = [...css.matchAll(/@import\s+'([^']+)'/g)].map((match) => match[1]);
	return imports
		.map((path) => readFileSync(fileURLToPath(new URL(path, index)), 'utf-8'))
		.join('\n');
}

/** Every `[data-theme='…']` block across the theme files, keyed by theme name. */
export function readPalettes(): Map<string, Palette> {
	const css = themeStylesheets();
	const palettes = new Map<string, Palette>();

	for (const block of css.split('}')) {
		const brace = block.indexOf('{');
		if (brace === -1) continue;

		const name = /data-theme='([^']+)'/.exec(block.slice(0, brace))?.[1];
		if (!name) continue;

		const values = new Map<string, string>();
		let colorScheme: string | undefined;

		for (const line of block.slice(brace + 1).split('\n')) {
			const custom = /^\s*--([\w-]+):\s*([^;]+);/.exec(line);
			if (custom) {
				values.set(custom[1], custom[2].trim());
				continue;
			}
			const scheme = /^\s*color-scheme:\s*([^;]+);/.exec(line);
			if (scheme) colorScheme = scheme[1].trim();
		}

		palettes.set(name, { values, colorScheme });
	}

	return palettes;
}

/**
 * Resolve a declared value to a concrete colour, following `var(--…)` into Tailwind's
 * palette or back into the theme, and flattening `color-mix(…)` onto `onto`.
 */
export function resolveToken(value: string, palette: Palette, onto: Rgb): Rgb {
	const mix = /^color-mix\(in oklab,\s*(.+?)\s+(\d+)%,\s*(.+?)\)$/.exec(value);
	if (mix) {
		const [, colour, percent, other] = mix;
		const base = resolveToken(colour, palette, onto);
		const share = Number(percent) / 100;
		// Themes only ever mix toward `transparent`, i.e. reduce alpha.
		if (other.trim() === 'transparent') return composite({ ...base, a: base.a * share }, onto);
		return composite({ ...base, a: share }, resolveToken(other, palette, onto));
	}

	const variable = /^var\(--([\w-]+)\)$/.exec(value);
	if (variable) {
		const name = variable[1];
		const tailwind = name.startsWith('color-') ? TAILWIND[name.slice('color-'.length)] : undefined;
		if (tailwind) return parseColor(tailwind);

		const own = palette.values.get(name);
		if (own) return resolveToken(own, palette, onto);

		throw new Error(`Unknown variable: --${name}`);
	}

	return parseColor(value);
}
