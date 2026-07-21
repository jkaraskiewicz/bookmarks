import type { Choice } from './choice';
import { choiceById, storedChoice } from './choice';

/**
 * The fonts on offer.
 *
 * Every one is a family that ships with both Windows and macOS, or a generic the
 * browser is guaranteed to resolve — this app has no webfonts to download, so a
 * family the machine lacks would silently fall through to something else and the
 * picker would be lying. Each entry is a stack for that reason: the named face
 * first, then the closest thing on a machine without it.
 */

export interface Font extends Choice {
	/** The `font-family` value, named face first. */
	stack: string;
}

export const FONTS = [
	{
		id: 'system',
		label: 'System',
		stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
	},
	{
		id: 'helvetica',
		label: 'Helvetica',
		stack: '"Helvetica Neue", Helvetica, Arial, sans-serif'
	},
	{ id: 'verdana', label: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
	{ id: 'trebuchet', label: 'Trebuchet MS', stack: '"Trebuchet MS", Tahoma, sans-serif' },
	{ id: 'georgia', label: 'Georgia', stack: 'Georgia, "Times New Roman", Times, serif' },
	{ id: 'times', label: 'Times New Roman', stack: '"Times New Roman", Times, serif' },
	{
		id: 'mono',
		label: 'Monospace',
		stack: 'ui-monospace, Menlo, Consolas, "Courier New", monospace'
	}
] as const satisfies readonly Font[];

export type FontId = (typeof FONTS)[number]['id'];

export const DEFAULT_FONT: FontId = 'system';

/** Where the choice is remembered. Read by the inline script in `app.html` too. */
export const FONT_STORAGE_KEY = 'bookmarks:font';

const FONT_IDS = FONTS.map((font) => font.id);

/** Coerce a stored string into a font this build offers. */
export function toFontId(value: unknown): FontId {
	return storedChoice(FONT_IDS, value, DEFAULT_FONT);
}

/** The `font-family` value for a font id. */
export function fontStack(id: FontId): string {
	return choiceById(FONTS, id)?.stack ?? FONTS[0].stack;
}
