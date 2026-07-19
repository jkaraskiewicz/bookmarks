import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PREFERENCE, STORAGE_KEY, THEMES, resolveTheme } from './index';

/**
 * `app.html` carries a small script that applies the theme before the first paint.
 * It cannot import from this module — it has to run before any module loads — so it
 * restates the theme list, the storage key and the resolution rule.
 *
 * That duplication is unavoidable, so it is checked instead: if the module and the
 * script drift apart, the page flashes the wrong theme on load, which is the one
 * thing the script exists to prevent.
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
