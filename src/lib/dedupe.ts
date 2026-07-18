/**
 * Duplicate detection.
 *
 * Two keys, deliberately. An *exact* key covers differences that certainly mean the
 * same page (merged silently); a *similar* key also folds differences that usually
 * but not always mean the same page (surfaced as a warning, never merged on our own).
 * The names match the `'exact' | 'similar'` outcome reported to callers.
 *
 * The stored URL is never rewritten — keys are derived on demand, so the TOML stays
 * exactly as you typed it and these rules can change later without a migration.
 */

/** Query parameters that only ever carry analytics, never page identity. */
const TRACKING_PARAM_PATTERN =
	/^(utm_|fbclid$|gclid$|dclid$|msclkid$|mc_eid$|mc_cid$|igshid$|ref_src$|spm$|_hsenc$|_hsmi$|vero_id$|yclid$)/i;

/**
 * A fragment is decoration (`#section`) unless it looks like a route (`#/path`,
 * `#!/path`) — hash-routed apps put real page identity there.
 */
function isRouteFragment(hash: string): boolean {
	return /^#!?\//.test(hash);
}

/**
 * Same key ⇒ certainly the same page. Folds case, default ports, decorative
 * fragments, empty paths and tracking parameters.
 */
export function exactKey(url: string): string {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return url.trim().toLowerCase(); // not a parseable URL; compare as-is
	}

	const scheme = parsed.protocol.toLowerCase();
	const host = parsed.hostname.toLowerCase();
	const port = parsed.port && !isDefaultPort(scheme, parsed.port) ? `:${parsed.port}` : '';

	const params = [...parsed.searchParams].filter(([key]) => !TRACKING_PARAM_PATTERN.test(key));
	params.sort(([a], [b]) => a.localeCompare(b));
	const query = params.length ? `?${new URLSearchParams(params)}` : '';

	const path = parsed.pathname === '/' ? '' : parsed.pathname;
	const hash = isRouteFragment(parsed.hash) ? parsed.hash : '';

	return `${scheme}//${host}${port}${path}${query}${hash}`;
}

function isDefaultPort(scheme: string, port: string): boolean {
	return (scheme === 'http:' && port === '80') || (scheme === 'https:' && port === '443');
}

/**
 * Same key ⇒ *probably* the same page. Everything {@link exactKey} folds, plus
 * http/https, www, and a trailing slash. Used only to warn, never to merge.
 */
export function similarKey(url: string): string {
	return exactKey(url)
		.replace(/^https?:\/\//, '')
		.replace(/^www\./, '')
		.replace(/\/+$/, '');
}

export interface DuplicateMatch<T> {
	/** Certainly the same page — safe to merge without asking. */
	exact?: T;
	/** Probably the same page — worth a warning, never merged automatically. */
	similar?: T;
}

/**
 * Find an existing item matching `url`. An exact match wins; otherwise a probable
 * one is reported as `similar`. `ignore` skips one item, so editing a bookmark
 * doesn't flag it as a duplicate of itself.
 */
export function findDuplicate<T extends { url: string }>(
	items: T[],
	url: string,
	ignore?: string
): DuplicateMatch<T> {
	const exact = exactKey(url);
	const similar = similarKey(url);
	let similarMatch: T | undefined;

	for (const item of items) {
		if (ignore !== undefined && item.url === ignore) continue;
		if (exactKey(item.url) === exact) return { exact: item };
		if (!similarMatch && similarKey(item.url) === similar) similarMatch = item;
	}

	return similarMatch ? { similar: similarMatch } : {};
}
