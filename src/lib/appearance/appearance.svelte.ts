import { browser } from '$app/environment';
import { DEFAULT_FONT, FONT_STORAGE_KEY, fontStack, toFontId, type FontId } from './fonts';
import {
	DEFAULT_FONT_SIZE,
	FONT_SIZE_STORAGE_KEY,
	fontScale,
	toFontSizeId,
	type FontSizeId
} from './fontSizes';

/**
 * The live typography settings: which font, and how big.
 *
 * The decisions are pure functions in `./fonts` and `./fontSizes`; this only wires
 * them to the browser — reading the stored choices and putting the result on the
 * document, where the stylesheet picks it up. The same split the theme uses.
 *
 * Both are custom properties on the root element rather than a class, because the
 * values are open-ended: a font stack is a string, not one of a handful of states.
 */
class Appearance {
	font = $state<FontId>(DEFAULT_FONT);
	fontSize = $state<FontSizeId>(DEFAULT_FONT_SIZE);

	/** Read the stored choices. Safe to call twice. */
	start(): void {
		if (!browser) return;
		this.font = toFontId(localStorage.getItem(FONT_STORAGE_KEY));
		this.fontSize = toFontSizeId(localStorage.getItem(FONT_SIZE_STORAGE_KEY));
	}

	setFont(id: FontId): void {
		this.font = id;
		if (browser) localStorage.setItem(FONT_STORAGE_KEY, id);
	}

	setFontSize(id: FontSizeId): void {
		this.fontSize = id;
		if (browser) localStorage.setItem(FONT_SIZE_STORAGE_KEY, id);
	}

	/** Put the current choices on the document, where the stylesheet keys off them. */
	apply(): void {
		if (!browser) return;
		const root = document.documentElement;
		root.style.setProperty('--app-font', fontStack(this.font));
		root.style.setProperty('--app-font-size', fontScale(this.fontSize));
	}
}

export const appearance = new Appearance();
