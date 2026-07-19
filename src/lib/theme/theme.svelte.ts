import { browser } from '$app/environment';
import {
	DEFAULT_PREFERENCE,
	STORAGE_KEY,
	resolveTheme,
	toPreference,
	type ThemeId,
	type ThemePreference
} from './index';

const LIGHT_QUERY = '(prefers-color-scheme: light)';

/**
 * The live theme: what the user picked, and what that resolves to right now.
 *
 * The decisions themselves are pure functions in `./index`; this only wires them to
 * the browser — reading the stored choice, following the system when asked to, and
 * putting `data-theme` on the document so the palette applies.
 */
class Theme {
	preference = $state<ThemePreference>(DEFAULT_PREFERENCE);
	prefersLight = $state(false);

	/** The theme actually showing. */
	get current(): ThemeId {
		return resolveTheme(this.preference, this.prefersLight);
	}

	/** Read the stored choice and start following the system. Safe to call twice. */
	start(): () => void {
		if (!browser) return () => {};

		this.preference = toPreference(localStorage.getItem(STORAGE_KEY));

		const media = window.matchMedia(LIGHT_QUERY);
		this.prefersLight = media.matches;
		const onChange = (event: MediaQueryListEvent) => (this.prefersLight = event.matches);
		media.addEventListener('change', onChange);

		return () => media.removeEventListener('change', onChange);
	}

	set(preference: ThemePreference) {
		this.preference = preference;
		if (browser) localStorage.setItem(STORAGE_KEY, preference);
	}

	/** Put the resolved theme on the document, where the palette CSS keys off it. */
	apply() {
		if (browser) document.documentElement.dataset.theme = this.current;
	}
}

export const theme = new Theme();
