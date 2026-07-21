import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PREFERENCE, STORAGE_KEY, THEMES, resolveTheme } from './index';
import { FONTS, FONT_STORAGE_KEY } from '$lib/appearance/fonts';
import { FONT_SIZES, FONT_SIZE_STORAGE_KEY } from '$lib/appearance/fontSizes';

/**
 * `app.html` carries a small script that applies the theme, font and text size
 * before the first paint. It cannot import from these modules — it has to run before
 * any module loads — so it restates their lists, storage keys and resolution rule.
 *
 * That duplication is unavoidable, so it is checked instead: if the modules and the
 * script drift apart, the page flashes the wrong appearance on load, which is the
 * one thing the script exists to prevent. A stale font or size is the worse case,
 * since correcting it reflows the entire layout rather than just recolouring it.
 */

const html = readFileSync(fileURLToPath(new URL('../../app.html', import.meta.url)), 'utf-8');
const script = html.slice(html.indexOf('<script>'), html.indexOf('</script>'));

describe('the pre-paint script matches the theme module', () => {
	it('lists exactly the themes the app offers', () => {
		const listed = /const THEMES = \[([^\]]*)\]/
			.exec(script)?.[1]
			.split(',')
			.map((entry) => entry.trim().replace(/^'|'$/g, ''))
			.filter(Boolean);

		expect(listed?.sort()).toEqual(THEMES.map((entry) => entry.id).sort());
	});

	it('reads the same storage key', () => {
		const key = /const STORAGE_KEY = '([^']+)'/.exec(script)?.[1];
		expect(key).toBe(STORAGE_KEY);
	});

	it('falls back to the same theme the module does', () => {
		const fallback = /const FALLBACK = '([^']+)'/.exec(script)?.[1];
		// What `system` resolves to when the OS expresses no preference.
		expect(fallback).toBe(resolveTheme(DEFAULT_PREFERENCE, false));
	});

	it('validates the stored value rather than trusting it', () => {
		// Without this, a stale or hand-edited value is applied verbatim, no palette
		// matches, and the module then corrects it — a flash on every load.
		expect(script).toContain('THEMES.includes(stored)');
	});
});

describe('the pre-paint script matches the typography modules', () => {
	/** The `{ id: 'value' }` map the script declares under `name`. */
	function declaredMap(name: string): Record<string, string> {
		const body = new RegExp(`const ${name} = \\{([\\s\\S]*?)\\};`).exec(script)?.[1] ?? '';
		return Object.fromEntries(
			[...body.matchAll(/([\w-]+):\s*(?:'([^']*)'|"([^"]*)")/g)].map((entry) => [
				entry[1],
				(entry[2] ?? entry[3]).replaceAll('"', "'")
			])
		);
	}

	it('offers exactly the fonts the module does, with the same stacks', () => {
		const declared = declaredMap('FONTS');
		const expected = Object.fromEntries(
			FONTS.map((font) => [font.id, font.stack.replaceAll('"', "'")])
		);
		expect(declared).toEqual(expected);
	});

	it('offers exactly the sizes the module does, with the same scales', () => {
		const declared = declaredMap('FONT_SIZES');
		expect(declared).toEqual(Object.fromEntries(FONT_SIZES.map((size) => [size.id, size.scale])));
	});

	it('reads the same storage keys', () => {
		expect(script).toContain(`localStorage.getItem('${FONT_STORAGE_KEY}')`);
		expect(script).toContain(`localStorage.getItem('${FONT_SIZE_STORAGE_KEY}')`);
	});

	it('applies the same custom properties the stylesheet reads', () => {
		const tokens = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf-8');
		for (const property of ['--app-font', '--app-font-size']) {
			expect(script, `script does not set ${property}`).toContain(property);
			expect(tokens, `tokens.css does not define ${property}`).toContain(property);
		}
	});

	it('ignores an unknown stored value rather than writing it through', () => {
		// A font id from an older build must leave the CSS default in place, not be
		// set as a font-family of its own — which would resolve to nothing.
		expect(script).toContain('if (font)');
		expect(script).toContain('if (size)');
	});
});
