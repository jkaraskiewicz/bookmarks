import { describe, it, expect } from 'vitest';
import { parseBookmarks, serializeBookmarks } from './toml';
import type { Bookmark } from '$lib/types';

describe('parseBookmarks', () => {
	it('parses a full bookmark block', () => {
		const toml = `
[[bookmark]]
title = "Angular"
url = "https://angular.dev"
tags = ["frontend", "docs"]
collection = "Dev/Frameworks"
notes = "Framework reference"
description = "The web framework"
favicon = "https://angular.dev/favicon.ico"
added = 2026-07-18T10:30:00Z
`;
		const [b] = parseBookmarks(toml);
		expect(b).toMatchObject({
			title: 'Angular',
			url: 'https://angular.dev',
			tags: ['frontend', 'docs'],
			collection: 'Dev/Frameworks',
			notes: 'Framework reference',
			description: 'The web framework',
			favicon: 'https://angular.dev/favicon.ico'
		});
		expect(b.added).toBe('2026-07-18T10:30:00.000Z');
	});

	it('accepts a hand-added entry with only a url, defaulting the rest', () => {
		const [b] = parseBookmarks(`[[bookmark]]\nurl = "https://example.com"\n`);
		expect(b.url).toBe('https://example.com');
		expect(b.title).toBe('https://example.com'); // title falls back to url
		expect(b.tags).toEqual([]);
		expect(b.collection).toBeUndefined();
		expect(typeof b.added).toBe('string');
	});

	it('drops entries without a url', () => {
		expect(parseBookmarks(`[[bookmark]]\ntitle = "no url"\n`)).toEqual([]);
	});

	it('returns [] for an empty file', () => {
		expect(parseBookmarks('')).toEqual([]);
	});
});

describe('serializeBookmarks', () => {
	const sample: Bookmark = {
		title: 'Angular',
		url: 'https://angular.dev',
		tags: ['frontend', 'docs'],
		collection: 'Dev/Frameworks',
		notes: 'ref',
		description: 'desc',
		favicon: 'https://angular.dev/favicon.ico',
		added: '2026-07-18T10:30:00.000Z'
	};

	it('round-trips through parse without loss', () => {
		const [b] = parseBookmarks(serializeBookmarks([sample]));
		expect(b).toEqual(sample);
	});

	it('omits empty optional fields from the output', () => {
		const minimal: Bookmark = {
			title: 'x',
			url: 'https://x.com',
			tags: [],
			added: '2026-07-18T10:30:00.000Z'
		};
		const out = serializeBookmarks([minimal]);
		expect(out).not.toContain('collection');
		expect(out).not.toContain('notes');
		expect(out).not.toContain('favicon');
	});

	it('writes a TOML datetime (unquoted) for added', () => {
		expect(serializeBookmarks([sample])).toContain('added = 2026-07-18T10:30:00.000Z');
	});
});
