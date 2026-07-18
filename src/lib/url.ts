/** The display host of a URL, without a leading `www.`. Falls back to the raw input. */
export function hostname(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return url;
	}
}

/** Normalize a user-entered URL: trim and ensure a scheme is present. '' stays ''. */
export function normalizeUrl(input: string): string {
	const url = input.trim();
	if (!url) return '';
	return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}
