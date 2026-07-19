import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The theme abstraction rests on one rule: components name a *role* (`bg-surface`),
 * never a colour (`bg-neutral-950`). Break it and that element simply stops changing
 * with the theme — which is easy to miss, because it still looks right in whichever
 * theme you happened to be viewing.
 *
 * This is the check that catches it. It found `divide-neutral-800`, missed by the
 * original migration because the sweep only looked at `bg`/`text`/`border`/`ring`.
 */

const SOURCE = fileURLToPath(new URL('../..', import.meta.url));

/** Everything Tailwind can colour, not just the properties we happen to use today. */
const COLOUR_PROPERTIES = [
	'bg',
	'text',
	'border',
	'ring',
	'divide',
	'outline',
	'accent',
	'caret',
	'decoration',
	'shadow',
	'placeholder',
	'fill',
	'stroke',
	'from',
	'via',
	'to'
].join('|');

/** Tailwind's built-in palette names. A theme role will never look like these. */
const PALETTE_NAMES = [
	'slate',
	'gray',
	'zinc',
	'neutral',
	'stone',
	'red',
	'orange',
	'amber',
	'yellow',
	'lime',
	'green',
	'emerald',
	'teal',
	'cyan',
	'sky',
	'blue',
	'indigo',
	'violet',
	'purple',
	'fuchsia',
	'pink',
	'rose'
].join('|');

const HARD_CODED = new RegExp(
	`\\b(?:${COLOUR_PROPERTIES})-(?:(?:${PALETTE_NAMES})-\\d+|white|black)(?:/\\d+)?\\b`,
	'g'
);

function sourceFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const path = join(directory, entry);
		if (statSync(path).isDirectory()) {
			// The theme module is where colours are *supposed* to be named.
			return entry === 'theme' ? [] : sourceFiles(path);
		}
		return /\.(svelte|ts)$/.test(entry) && !entry.endsWith('.spec.ts') ? [path] : [];
	});
}

describe('components name roles, not colours', () => {
	const offences = sourceFiles(SOURCE).flatMap((path) => {
		const matches = readFileSync(path, 'utf-8').match(HARD_CODED) ?? [];
		return matches.map((match) => `${path.slice(SOURCE.length)}: ${match}`);
	});

	it('finds no hard-coded palette colours outside the theme module', () => {
		// `white`/`black` count too: both are invisible in one theme or another.
		expect(offences, `use a theme token instead:\n  ${offences.join('\n  ')}`).toEqual([]);
	});

	it('is actually looking at the source', () => {
		// Guards against the sweep silently matching nothing, which would make the
		// check above pass for the wrong reason.
		const files = sourceFiles(SOURCE);
		expect(files.length).toBeGreaterThan(20);
		expect(files.some((path) => path.endsWith('BookmarkList.svelte'))).toBe(true);
	});
});
