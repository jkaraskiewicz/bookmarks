import type { Choice } from './choice';
import { choiceById, storedChoice } from './choice';

/**
 * The text sizes on offer.
 *
 * Expressed as a percentage of the browser's own base size rather than a pixel
 * count, so someone who has already raised their default keeps that and these scale
 * from it. Applied to the root element, which every `rem`-based size in the
 * interface is measured against — so one value moves the whole layout together
 * instead of only the body text.
 */

export interface FontSize extends Choice {
	/** A root `font-size`, relative to the browser's own. */
	scale: string;
}

export const FONT_SIZES = [
	{ id: 'small', label: 'Small', scale: '87.5%' },
	{ id: 'medium', label: 'Medium', scale: '100%' },
	{ id: 'large', label: 'Large', scale: '112.5%' },
	{ id: 'huge', label: 'Extra large', scale: '125%' }
] as const satisfies readonly FontSize[];

export type FontSizeId = (typeof FONT_SIZES)[number]['id'];

export const DEFAULT_FONT_SIZE: FontSizeId = 'medium';

/** Where the choice is remembered. Read by the inline script in `app.html` too. */
export const FONT_SIZE_STORAGE_KEY = 'bookmarks:font-size';

const FONT_SIZE_IDS = FONT_SIZES.map((size) => size.id);

/** Coerce a stored string into a size this build offers. */
export function toFontSizeId(value: unknown): FontSizeId {
	return storedChoice(FONT_SIZE_IDS, value, DEFAULT_FONT_SIZE);
}

/** The root `font-size` for a size id. */
export function fontScale(id: FontSizeId): string {
	return choiceById(FONT_SIZES, id)?.scale ?? '100%';
}
