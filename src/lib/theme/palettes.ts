import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { composite, parseColor, type Rgb } from './contrast';
import { TAILWIND } from './tailwindPalette';

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
