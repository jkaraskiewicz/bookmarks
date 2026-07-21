import type { PageMetadata } from '$lib/types';
import { attributeValue, decodeEntities } from '$lib/html';
import { pickFavicon } from './favicon';

/**
 * Reading a page's own description of itself out of its HTML. Pure — no network, so
 * every rule here is testable against a string.
 */

/** Pull the `content` value out of the first <meta> tag matching `matcher`. */
function metaContent(head: string, matcher: RegExp): string | undefined {
	const tag = head.match(matcher)?.[0];
	if (!tag) return undefined;
	const content = attributeValue(tag, 'content');
	return content ? decodeEntities(content) : undefined;
}

/** A <meta> matcher for a given attribute/value pair, e.g. property="og:title". */
function metaTag(attribute: 'property' | 'name', value: string): RegExp {
	return new RegExp(`<meta[^>]+${attribute}\\s*=\\s*["']${value}["'][^>]*>`, 'i');
}

/** The page title — OpenGraph `og:title` preferred, then `<title>`. */
function extractTitle(head: string): string | undefined {
	const openGraph = metaContent(head, metaTag('property', 'og:title'));
	if (openGraph) return openGraph;

	const title = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
	return title ? decodeEntities(title) : undefined;
}

/** The page description — OpenGraph preferred, then `<meta name="description">`. */
function extractDescription(head: string): string | undefined {
	return (
		metaContent(head, metaTag('property', 'og:description')) ??
		metaContent(head, metaTag('name', 'description'))
	);
}

/** Everything before `</head>`, which is all the metadata can live in. */
function headOf(html: string): string {
	return html.slice(0, html.indexOf('</head>') + 1 || html.length);
}

/** Extract title, description and favicon from a page's HTML. */
export function extractMetadata(html: string, baseUrl: string): PageMetadata {
	const head = headOf(html);
	return {
		title: extractTitle(head),
		description: extractDescription(head),
		favicon: pickFavicon(head, baseUrl)
	};
}
