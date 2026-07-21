import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { Bookmark, NewBookmark } from '$lib/types';
import { splitList } from '$lib/tags';
import {
	readBookmarks,
	addBookmark,
	updateBookmark,
	deleteBookmark,
	deleteBookmarks,
	mergeIntoBookmark
} from '$lib/server/repository';
import { refreshMetadataInBackground, pendingMetadata } from '$lib/server/enrichment';
import { guard } from '$lib/server/action';
import { invalid } from '$lib/server/errors';
import { repeatedField, requiredField, textField } from '$lib/server/form';

/** Messages for references the client should always have supplied. */
const MISSING_URL = 'Missing URL.';
const MISSING_REFERENCE = 'Missing bookmark reference.';

/** The bookmark fields every add/edit form submits. */
function readFields(form: FormData): NewBookmark {
	return {
		url: textField(form, 'url'),
		title: textField(form, 'title'),
		tags: splitList(textField(form, 'tags')),
		collection: textField(form, 'collection'),
		notes: textField(form, 'notes')
	};
}

/** The URLs a bulk action submits, one repeated field per selected bookmark. */
function readSelection(form: FormData): string[] {
	const urls = repeatedField(form, 'url');
	if (urls.length === 0) throw invalid('Nothing selected.');
	return urls;
}

/**
 * The response to an add that matched something already saved. Deliberately not a
 * DomainError: it carries the matched bookmark, so the add bar can offer to merge
 * into it or add anyway rather than only showing a message.
 */
function duplicateRefusal(existing: Bookmark, duplicate: 'exact' | 'similar' | undefined) {
	return fail(409, {
		message:
			duplicate === 'exact'
				? 'That URL is already bookmarked.'
				: 'That looks like a bookmark you already have.',
		duplicate,
		existing: {
			url: existing.url,
			title: existing.title,
			collection: existing.collection
		}
	});
}

export const load: PageServerLoad = async () => {
	return { bookmarks: await readBookmarks(), pending: pendingMetadata() };
};

export const actions: Actions = {
	add: ({ request }) =>
		guard(async () => {
			const form = await request.formData();
			const fields = readFields(form);
			if (!fields.url) throw invalid('A URL is required.');

			// Set once the user has answered a "looks like a duplicate" prompt.
			const force = form.get('force') === 'true';
			const { bookmark, created, duplicate } = await addBookmark(fields, force);
			if (!created) return duplicateRefusal(bookmark, duplicate);

			// Enrich title/description/favicon in the background; UI refreshes shortly after.
			refreshMetadataInBackground(bookmark.url);
			return { added: bookmark.url };
		}),

	/** "Add my new tags to it" — fold the typed fields into the existing bookmark. */
	merge: ({ request }) =>
		guard(async () => {
			const form = await request.formData();
			const target = requiredField(form, 'existingUrl', MISSING_REFERENCE);
			await mergeIntoBookmark(target, readFields(form));
			return { merged: target };
		}),

	update: ({ request }) =>
		guard(async () => {
			const form = await request.formData();
			const originalUrl = requiredField(form, 'originalUrl', MISSING_REFERENCE);
			await updateBookmark(originalUrl, readFields(form));
			return { updated: true };
		}),

	delete: ({ request }) =>
		guard(async () => {
			const form = await request.formData();
			await deleteBookmark(requiredField(form, 'url', MISSING_URL));
			return { deleted: true };
		}),

	refresh: ({ request }) =>
		guard(async () => {
			const form = await request.formData();
			const url = requiredField(form, 'url', MISSING_URL);
			refreshMetadataInBackground(url);
			return { refreshed: url };
		}),

	/** Delete every selected bookmark in one transaction. */
	deleteSelected: ({ request }) =>
		guard(async () => {
			const urls = readSelection(await request.formData());
			return { deleted: await deleteBookmarks(urls), action: 'delete' as const };
		}),

	/** Queue a metadata refresh for every selected bookmark. */
	refreshSelected: ({ request }) =>
		guard(async () => {
			const urls = readSelection(await request.formData());
			// The enrichment queue paces these, so handing over the whole selection is
			// safe however large it is.
			for (const url of urls) refreshMetadataInBackground(url);
			return { refreshing: urls.length, action: 'refresh' as const };
		})
};
