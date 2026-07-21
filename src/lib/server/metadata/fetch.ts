import type { PageMetadata } from '$lib/types';
import { extractMetadata } from './extract';
import { conventionalFavicon } from './favicon';

/** Going out to the network for a page. The only part of metadata that can fail. */

const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT =
	'Mozilla/5.0 (compatible; BookmarkManager/1.0; +http://localhost) metadata-fetcher';

/** Fetch with a deadline, so one unresponsive host cannot hold a slot forever. */
async function fetchWithTimeout(url: string): Promise<Response> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		return await fetch(url, {
			signal: controller.signal,
			redirect: 'follow',
			headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' }
		});
	} finally {
		clearTimeout(timer);
	}
}

/** True when a response carries a page we can read metadata out of. */
function isReadableHtml(response: Response): boolean {
	return response.ok && (response.headers.get('content-type') ?? '').includes('html');
}

/**
 * Fetch a URL and extract page metadata. Never throws — returns {} on failure.
 *
 * When the page itself cannot be read — a private document answering 401, a PDF, a
 * page behind a login — the site's icon is usually still public, so the conventional
 * `/favicon.ico` is offered rather than giving up entirely.
 *
 * A request that never got a response (bad host, timeout) yields nothing: with no
 * evidence the host exists, guessing at an icon URL for it is not worth it.
 */
export async function fetchMetadata(url: string): Promise<PageMetadata> {
	try {
		const response = await fetchWithTimeout(url);
		const source = response.url || url;

		if (!isReadableHtml(response)) {
			// Whatever the status, the host answered — so its icon is worth a guess.
			return { favicon: conventionalFavicon(source) };
		}

		return extractMetadata(await response.text(), source);
	} catch {
		return {};
	}
}
