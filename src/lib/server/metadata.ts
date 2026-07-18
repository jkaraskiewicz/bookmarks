import type { PageMetadata } from '$lib/types';
import { decodeEntities } from '$lib/html';

const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT =
	'Mozilla/5.0 (compatible; BookmarkManager/1.0; +http://localhost) metadata-fetcher';

/** Pull the `content` value out of a matched <meta> tag (attr order-independent). */
function metaContent(html: string, matcher: RegExp): string | undefined {
	const tag = html.match(matcher)?.[0];
	if (!tag) return undefined;
	const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
	return content ? decodeEntities(content) : undefined;
}

/** The page title — OpenGraph `og:title` preferred, then `<title>`. */
function extractTitle(head: string): string | undefined {
	const og = metaContent(head, /<meta[^>]+property\s*=\s*["']og:title["'][^>]*>/i);
	if (og) return og;
	const title = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
	return title ? decodeEntities(title) : undefined;
}

/** The page description — OpenGraph preferred, then `<meta name="description">`. */
function extractDescription(head: string): string | undefined {
	return (
		metaContent(head, /<meta[^>]+property\s*=\s*["']og:description["'][^>]*>/i) ??
		metaContent(head, /<meta[^>]+name\s*=\s*["']description["'][^>]*>/i)
	);
}

/** Extract title, description and favicon from a page's HTML. Exported for testing. */
export function extractMetadata(html: string, baseUrl: string): PageMetadata {
	const head = html.slice(0, html.indexOf('</head>') + 1 || html.length);
	return {
		title: extractTitle(head),
		description: extractDescription(head),
		favicon: pickFavicon(head, baseUrl)
	};
}

/** Rank an icon <link> by its rel — a plain "icon" beats apple-touch beats fluid/mask. */
function iconScore(rel: string): number {
	if (/\bmask-icon\b|\bfluid-icon\b/.test(rel)) return 1;
	if (/\bapple-touch-icon\b/.test(rel)) return 2;
	if (/\bicon\b/.test(rel)) return 3; // includes "shortcut icon"
	return 0;
}

/**
 * Choose the best favicon from a page's <head>, preferring standard rels.
 * An empty placeholder (href="data:,") means the site opts out of a favicon.
 * Falls back to the conventional /favicon.ico when nothing is declared.
 */
function pickFavicon(head: string, baseUrl: string): string | undefined {
	let bestHref: string | undefined;
	let bestScore = 0;
	for (const tag of head.match(/<link\b[^>]*>/gi) ?? []) {
		const rel = tag.match(/rel\s*=\s*["']([^"']*)["']/i)?.[1]?.toLowerCase();
		if (!rel) continue;
		const score = iconScore(rel);
		if (score > bestScore) {
			bestScore = score;
			bestHref = tag.match(/href\s*=\s*["']([^"']*)["']/i)?.[1]?.trim();
		}
	}

	try {
		if (bestScore === 0) return new URL('/favicon.ico', baseUrl).href;
		if (!bestHref || /^data:,?$/.test(bestHref)) return undefined;
		return new URL(bestHref, baseUrl).href;
	} catch {
		return undefined;
	}
}

/** Fetch a URL and extract page metadata. Never throws — returns {} on failure. */
export async function fetchMetadata(url: string): Promise<PageMetadata> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const res = await fetch(url, {
			signal: controller.signal,
			redirect: 'follow',
			headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' }
		});
		if (!res.ok) return {};
		const type = res.headers.get('content-type') ?? '';
		if (!type.includes('html')) return {};
		const html = await res.text();
		return extractMetadata(html, res.url || url);
	} catch {
		return {};
	} finally {
		clearTimeout(timer);
	}
}
