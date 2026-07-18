import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { NewBookmark } from '$lib/types';
import {
	readBookmarks,
	addBookmark,
	updateBookmark,
	deleteBookmark,
	refreshMetadataInBackground,
	pendingMetadata
} from '$lib/server/storage';

/** Split a comma/newline separated tag string into a clean list. */
function parseTags(raw: FormDataEntryValue | null): string[] {
	if (typeof raw !== 'string') return [];
	return raw
		.split(/[,\n]/)
		.map((t) => t.trim())
		.filter(Boolean);
}

function readFields(form: FormData): NewBookmark {
	return {
		url: String(form.get('url') ?? ''),
		title: String(form.get('title') ?? ''),
		tags: parseTags(form.get('tags')),
		collection: String(form.get('collection') ?? ''),
		notes: String(form.get('notes') ?? '')
	};
}

export const load: PageServerLoad = async () => {
	return { bookmarks: await readBookmarks(), pending: pendingMetadata() };
};

export const actions: Actions = {
	add: async ({ request }) => {
		const form = await request.formData();
		const fields = readFields(form);
		if (!fields.url?.trim()) return fail(400, { message: 'A URL is required.' });

		const { bookmark, created } = await addBookmark(fields);
		if (!created) {
			return fail(409, { message: 'That URL is already bookmarked.', url: bookmark.url });
		}
		// Enrich title/description/favicon in the background; UI refreshes shortly after.
		refreshMetadataInBackground(bookmark.url);
		return { added: bookmark.url };
	},

	update: async ({ request }) => {
		const form = await request.formData();
		const originalUrl = String(form.get('originalUrl') ?? '');
		if (!originalUrl) return fail(400, { message: 'Missing bookmark reference.' });
		await updateBookmark(originalUrl, readFields(form));
		return { updated: true };
	},

	delete: async ({ request }) => {
		const form = await request.formData();
		const url = String(form.get('url') ?? '');
		if (!url) return fail(400, { message: 'Missing URL.' });
		await deleteBookmark(url);
		return { deleted: true };
	},

	refresh: async ({ request }) => {
		const form = await request.formData();
		const url = String(form.get('url') ?? '');
		if (!url) return fail(400, { message: 'Missing URL.' });
		refreshMetadataInBackground(url);
		return { refreshed: url };
	}
};
