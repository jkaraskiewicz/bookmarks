/**
 * Themes.
 *
 * A theme is a `data-theme` value with a matching block in `palettes.css`. Adding one
 * means writing that block and adding an entry here; nothing else in the app names a
 * colour, so nothing else needs to change.
 */

/**
 * A concrete look. `system` is not one of these — it resolves to one of them.
 *
 * `base` says whether the theme is fundamentally light or dark. Third-party widgets
 * with their own two-way switch (Svelte Flow's canvas, and the `color-scheme` hint
 * browsers use for scrollbars and form controls) need that answer, and only the theme
 * itself knows it.
 */
export const THEMES = [
	{ id: 'dark', label: 'Dark', icon: '🌙', base: 'dark' },
	{ id: 'light', label: 'Light', icon: '☀️', base: 'light' },
	{ id: 'darcula', label: 'Darcula', icon: '🧛', base: 'dark' }
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

/** What the user picked. `system` follows the operating system. */
export type ThemePreference = ThemeId | 'system';

export const DEFAULT_PREFERENCE: ThemePreference = 'system';

/** Where the choice is remembered. Read by the inline script in `app.html` too. */
export const STORAGE_KEY = 'bookmarks:theme';

type ThemeEntry = (typeof THEMES)[number];

const THEME_IDS: readonly string[] = THEMES.map((theme) => theme.id);

/** The registry entry for a theme. */
function themeEntry(id: ThemeId): ThemeEntry | undefined {
	return THEMES.find((theme) => theme.id === id);
}

/** How `system` presents itself, since it has no entry of its own. */
const SYSTEM = { label: 'System', icon: '🖥️' } as const;

/** True when `value` is a theme this build knows how to render. */
export function isThemeId(value: unknown): value is ThemeId {
	return typeof value === 'string' && THEME_IDS.includes(value);
}

/** Coerce anything (a stored string, a URL param) into a usable preference. */
export function toPreference(value: unknown): ThemePreference {
	if (value === 'system' || isThemeId(value)) return value;
	return DEFAULT_PREFERENCE;
}

/**
 * The theme to actually apply. `system` becomes whatever the OS asks for, defaulting
 * to dark when it has no opinion — this app started dark and should stay that way for
 * anyone whose system does not say otherwise.
 */
export function resolveTheme(preference: ThemePreference, prefersLight = false): ThemeId {
	if (preference !== 'system') return preference;
	return prefersLight ? 'light' : 'dark';
}

/**
 * The order the toggle cycles through: every theme, then `system`. Derived from the
 * registry, so a new theme joins the cycle without touching this.
 */
export const PREFERENCE_ORDER: readonly ThemePreference[] = [
	...THEMES.map((entry) => entry.id),
	'system'
];

/** The next preference when cycling through the toggle. */
export function nextPreference(current: ThemePreference): ThemePreference {
	const index = PREFERENCE_ORDER.indexOf(current);
	return PREFERENCE_ORDER[(index + 1) % PREFERENCE_ORDER.length];
}

/** How a preference should be described in the UI. */
export function preferenceLabel(preference: ThemePreference): string {
	if (preference === 'system') return SYSTEM.label;
	return themeEntry(preference)?.label ?? preference;
}

export function preferenceIcon(preference: ThemePreference): string {
	if (preference === 'system') return SYSTEM.icon;
	return themeEntry(preference)?.icon ?? '';
}

/** Whether a theme is fundamentally light or dark, for widgets that only know those two. */
export function themeBase(id: ThemeId): 'light' | 'dark' {
	return themeEntry(id)?.base ?? 'dark';
}
