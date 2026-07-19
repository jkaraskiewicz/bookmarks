import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { NewBookmark } from '$lib/types';
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

function readFields(form: FormData): NewBookmark {
	return {
		url: String(form.get('url') ?? ''),
		title: String(form.get('title') ?? ''),
		tags: splitList(form.get('tags') as string | null),
		collection: String(form.get('collection') ?? ''),
		notes: String(form.get('notes') ?? '')
	};
}

/** Read the repeated `url` fields a bulk action submits. */
function selectedUrls(form: FormData): string[] {
	return form.getAll('url').map(String).filter(Boolean);
}

/** Read the `url` field from a submitted form. */
async function formUrl(request: Request): Promise<string> {
	const form = await request.formData();
	return String(form.get('url') ?? '');
}

export const load: PageServerLoad = async () => {
	return { bookmarks: await readBookmarks(), pending: pendingMetadata() };
};

export const actions: Actions = {
	add: ({ request }) =>
		guard(async () => {
			const form = await request.formData();
			const fields = readFields(form);
			if (!fields.url?.trim()) throw invalid('A URL is required.');

			// Set once the user has answered a "looks like a duplicate" prompt.
			const force = form.get('force') === 'true';
			const { bookmark, created, duplicate } = await addBookmark(fields, force);

			// Not a DomainError: the response carries the matched bookmark so the add
			// bar can offer to merge into it or add anyway.
			if (!created) {
				return fail(409, {
					message:
						duplicate === 'exact'
							? 'That URL is already bookmarked.'
							: 'That looks like a bookmark you already have.',
					duplicate,
					existing: { url: bookmark.url, title: bookmark.title, collection: bookmark.collection }
				});
			}

			// Enrich title/description/favicon in the background; UI refreshes shortly after.
			refreshMetadataInBackground(bookmark.url);
			return { added: bookmark.url };
		}),

	/** "Add my new tags to it" — fold the typed fields into the existing bookmark. */
	merge: ({ request }) =>
		guard(async () => {
			const form = await request.formData();
			const target = String(form.get('existingUrl') ?? '');
			if (!target) throw invalid('Missing bookmark reference.');
			await mergeIntoBookmark(target, readFields(form));
			return { merged: target };
		}),

	update: ({ request }) =>
		guard(async () => {
			const form = await request.formData();
			const originalUrl = String(form.get('originalUrl') ?? '');
			if (!originalUrl) throw invalid('Missing bookmark reference.');
			await updateBookmark(originalUrl, readFields(form));
			return { updated: true };
		}),

	delete: ({ request }) =>
		guard(async () => {
			const url = await formUrl(request);
			if (!url) throw invalid('Missing URL.');
			await deleteBookmark(url);
			return { deleted: true };
		}),

	refresh: ({ request }) =>
		guard(async () => {
			const url = await formUrl(request);
			if (!url) throw invalid('Missing URL.');
			refreshMetadataInBackground(url);
			return { refreshed: url };
		}),

	/** Delete every selected bookmark in one transaction. */
	deleteSelected: ({ request }) =>
		guard(async () => {
			const urls = selectedUrls(await request.formData());
			if (urls.length === 0) throw invalid('Nothing selected.');

			const deleted = await deleteBookmarks(urls);
			return { deleted, action: 'delete' as const };
		}),

	/** Queue a metadata refresh for every selected bookmark. */
	refreshSelected: ({ request }) =>
		guard(async () => {
			const urls = selectedUrls(await request.formData());
			if (urls.length === 0) throw invalid('Nothing selected.');

			// The enrichment queue paces these, so handing over the whole selection is
			// safe however large it is.
			for (const url of urls) refreshMetadataInBackground(url);
			return { refreshing: urls.length, action: 'refresh' as const };
		})
};
