/** The display host of a URL, without a leading `www.`. Falls back to the raw input. */
export function hostname(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return url;
	}
}

/** Trim a user-entered URL and add `https://` when no scheme is given. '' stays ''. */
export function ensureScheme(input: string): string {
	const url = input.trim();
	if (!url) return '';
	return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}
