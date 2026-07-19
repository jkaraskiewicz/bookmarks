import { describe, it, expect } from 'vitest';
import {
	DEFAULT_PREFERENCE,
	PREFERENCE_ORDER,
	THEMES,
	isThemeId,
	nextPreference,
	preferenceIcon,
	preferenceLabel,
	resolveTheme,
	themeBase,
	toPreference
} from './index';

describe('isThemeId', () => {
	it('accepts the themes this build ships', () => {
		expect(isThemeId('dark')).toBe(true);
		expect(isThemeId('light')).toBe(true);
	});

	it('rejects anything else, including the system preference', () => {
		expect(isThemeId('system')).toBe(false);
		expect(isThemeId('solarized')).toBe(false);
		expect(isThemeId(null)).toBe(false);
		expect(isThemeId(undefined)).toBe(false);
	});
});

describe('toPreference', () => {
	it('keeps a valid stored choice', () => {
		expect(toPreference('light')).toBe('light');
		expect(toPreference('system')).toBe('system');
	});

	it('falls back for junk, so a corrupted store cannot break the page', () => {
		expect(toPreference('neon')).toBe(DEFAULT_PREFERENCE);
		expect(toPreference(null)).toBe(DEFAULT_PREFERENCE);
		expect(toPreference(42)).toBe(DEFAULT_PREFERENCE);
	});
});

describe('resolveTheme', () => {
	it('uses an explicit choice regardless of the system', () => {
		expect(resolveTheme('light', false)).toBe('light');
		expect(resolveTheme('dark', true)).toBe('dark');
	});

	it('follows the system when asked to', () => {
		expect(resolveTheme('system', true)).toBe('light');
		expect(resolveTheme('system', false)).toBe('dark');
	});

	it('defaults to dark when the system has no opinion', () => {
		// The app started dark; anyone whose system is silent keeps it.
		expect(resolveTheme('system')).toBe('dark');
	});
});

describe('nextPreference', () => {
	it('offers every theme, then the system option', () => {
		expect(PREFERENCE_ORDER).toEqual([...THEMES.map((entry) => entry.id), 'system']);
	});

	it('visits every option exactly once per lap and returns to the start', () => {
		const seen = new Set<string>();
		let preference = DEFAULT_PREFERENCE;

		for (let step = 0; step < PREFERENCE_ORDER.length; step++) {
			seen.add(preference);
			preference = nextPreference(preference);
		}

		expect(seen.size).toBe(PREFERENCE_ORDER.length);
		expect(preference).toBe(DEFAULT_PREFERENCE);
	});

	it('advances rather than sticking', () => {
		for (const preference of PREFERENCE_ORDER) {
			expect(nextPreference(preference)).not.toBe(preference);
		}
	});
});

describe('labels', () => {
	it('names every theme and the system option', () => {
		expect(preferenceLabel('dark')).toBe('Dark');
		expect(preferenceLabel('light')).toBe('Light');
		expect(preferenceLabel('system')).toBe('System');
	});

	it('gives every option an icon', () => {
		for (const preference of ['dark', 'light', 'system'] as const) {
			expect(preferenceIcon(preference)).not.toBe('');
		}
	});
});

describe('themeBase', () => {
	it('reports what each theme is built on', () => {
		expect(themeBase('light')).toBe('light');
		expect(themeBase('dark')).toBe('dark');
		expect(themeBase('darcula')).toBe('dark');
	});

	it('gives every registered theme a base', () => {
		for (const entry of THEMES) {
			expect(['light', 'dark']).toContain(themeBase(entry.id));
		}
	});
});

describe('the theme registry', () => {
	it('gives every theme a unique id', () => {
		const ids = THEMES.map((entry) => entry.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('gives every theme a label and an icon', () => {
		for (const entry of THEMES) {
			expect(entry.label).toBeTruthy();
			expect(entry.icon).toBeTruthy();
		}
	});
});
