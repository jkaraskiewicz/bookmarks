import { attributeValue } from '$lib/html';

/**
 * Choosing a page's icon. Split out from the rest of the metadata because it is the
 * only part with a fallback story: a page that cannot be read at all still usually
 * serves an icon, and that is the difference between a bookmark showing its site's
 * mark and showing a grey square.
 */

/** Rank an icon <link> by its rel — a plain "icon" beats apple-touch beats fluid/mask. */
function iconScore(rel: string): number {
	if (/\bmask-icon\b|\bfluid-icon\b/.test(rel)) return 1;
	if (/\bapple-touch-icon\b/.test(rel)) return 2;
	if (/\bicon\b/.test(rel)) return 3; // includes "shortcut icon"
	return 0;
}

/** Resolve a possibly-relative href against the page it came from. */
function absoluteUrl(href: string, baseUrl: string): string | undefined {
	try {
		return new URL(href, baseUrl).href;
	} catch {
		return undefined;
	}
}

/**
 * The icon every site is assumed to serve unless it says otherwise. Not verified —
 * a broken one is hidden by the UI, and checking would cost a request per bookmark.
 */
export function conventionalFavicon(url: string): string | undefined {
	return absoluteUrl('/favicon.ico', url);
}

/** The best-ranked icon <link> in a head, or nothing when none is declared. */
function declaredIcon(head: string): string | undefined {
	let bestHref: string | undefined;
	let bestScore = 0;

	for (const tag of head.match(/<link\b[^>]*>/gi) ?? []) {
		const rel = attributeValue(tag, 'rel')?.toLowerCase();
		if (!rel) continue;

		const score = iconScore(rel);
		if (score > bestScore) {
			bestScore = score;
			// An empty placeholder (href="data:,") means the site opts out of an icon,
			// so it still counts as declared — it just resolves to nothing.
			bestHref = attributeValue(tag, 'href')?.trim() || '';
		}
	}

	return bestScore === 0 ? undefined : bestHref;
}

/**
 * Choose the best favicon from a page's <head>, preferring standard rels, and
 * falling back to the conventional `/favicon.ico` when nothing is declared.
 */
export function pickFavicon(head: string, baseUrl: string): string | undefined {
	const href = declaredIcon(head);
	if (href === undefined) return conventionalFavicon(baseUrl);
	if (!href || /^data:,?$/.test(href)) return undefined;
	return absoluteUrl(href, baseUrl);
}
