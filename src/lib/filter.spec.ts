import { describe, it, expect } from 'vitest';
import { filterBookmarks, allTags, type BookmarkFilter } from './filter';
import type { Bookmark } from './types';

function bm(over: Partial<Bookmark>): Bookmark {
	return { url: 'https://x', title: 't', tags: [], added: '2026-01-01', ...over };
}

const none: BookmarkFilter = { search: '', tags: [], collection: '' };

const data: Bookmark[] = [
	bm({
		url: 'https://angular.dev',
		title: 'Angular',
		tags: ['frontend'],
		collection: 'Dev/Frameworks'
	}),
	bm({ url: 'https://github.com', title: 'GitHub', tags: ['git', 'dev'], collection: 'Dev/Tools' }),
	bm({
		url: 'https://news.ycombinator.com',
		title: 'HN',
		tags: ['news'],
		collection: 'News',
		notes: 'startups'
	})
];

describe('filterBookmarks', () => {
	it('returns all with an empty filter', () => {
		expect(filterBookmarks(data, none)).toHaveLength(3);
	});

	it('searches title, url, notes and description case-insensitively', () => {
		expect(filterBookmarks(data, { ...none, search: 'ANGULAR' }).map((b) => b.title)).toEqual([
			'Angular'
		]);
		expect(filterBookmarks(data, { ...none, search: 'startups' }).map((b) => b.title)).toEqual([
			'HN'
		]);
	});

	it('requires every selected tag (AND)', () => {
		expect(filterBookmarks(data, { ...none, tags: ['git', 'dev'] }).map((b) => b.title)).toEqual([
			'GitHub'
		]);
		expect(filterBookmarks(data, { ...none, tags: ['git', 'news'] })).toEqual([]);
	});

	it('filters by collection including descendants', () => {
		expect(filterBookmarks(data, { ...none, collection: 'Dev' }).map((b) => b.title)).toEqual([
			'Angular',
			'GitHub'
		]);
	});

	it('combines search, tags and collection', () => {
		expect(
			filterBookmarks(data, { search: 'git', tags: ['dev'], collection: 'Dev' }).map((b) => b.title)
		).toEqual(['GitHub']);
	});
});

describe('allTags', () => {
	it('returns distinct tags sorted', () => {
		expect(allTags(data)).toEqual(['dev', 'frontend', 'git', 'news']);
	});
});
