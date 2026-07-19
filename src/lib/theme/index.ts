/**
 * Themes.
 *
 * A theme is a `data-theme` value with a matching block in `palettes.css`. Adding one
 * means writing that block and adding an entry here; nothing else in the app names a
 * colour, so nothing else needs to change.
 */

/** A concrete look. `system` is not one of these — it resolves to one of them. */
export const THEMES = [
	{ id: 'dark', label: 'Dark', icon: '🌙' },
	{ id: 'light', label: 'Light', icon: '☀️' }
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

/** What the user picked. `system` follows the operating system. */
export type ThemePreference = ThemeId | 'system';

export const DEFAULT_PREFERENCE: ThemePreference = 'system';

/** Where the choice is remembered. Read by the inline script in `app.html` too. */
export const STORAGE_KEY = 'bookmarks:theme';

const THEME_IDS: readonly string[] = THEMES.map((theme) => theme.id);

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

/** The next preference when cycling through the toggle: dark → light → system → dark. */
export function nextPreference(current: ThemePreference): ThemePreference {
	const order: ThemePreference[] = ['dark', 'light', 'system'];
	return order[(order.indexOf(current) + 1) % order.length];
}

/** How a preference should be described in the UI. */
export function preferenceLabel(preference: ThemePreference): string {
	if (preference === 'system') return 'System';
	return THEMES.find((theme) => theme.id === preference)?.label ?? preference;
}

export function preferenceIcon(preference: ThemePreference): string {
	if (preference === 'system') return '🖥️';
	return THEMES.find((theme) => theme.id === preference)?.icon ?? '';
}
