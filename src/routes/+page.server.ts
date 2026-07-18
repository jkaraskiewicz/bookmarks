import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { NewBookmark } from '$lib/types';
import {
	readBookmarks,
	addBookmark,
	updateBookmark,
	deleteBookmark,
	mergeIntoBookmark
} from '$lib/server/repository';
import { refreshMetadataInBackground, pendingMetadata } from '$lib/server/enrichment';

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

/** Read the `url` field from a submitted form. */
async function formUrl(request: Request): Promise<string> {
	const form = await request.formData();
	return String(form.get('url') ?? '');
}

export const load: PageServerLoad = async () => {
	return { bookmarks: await readBookmarks(), pending: pendingMetadata() };
};

export const actions: Actions = {
	add: async ({ request }) => {
		const form = await request.formData();
		const fields = readFields(form);
		if (!fields.url?.trim()) return fail(400, { message: 'A URL is required.' });

		// Set once the user has answered a "looks like a duplicate" prompt.
		const force = form.get('force') === 'true';
		const { bookmark, created, duplicate } = await addBookmark(fields, force);

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
	},

	/** "Add my new tags to it" — fold the typed fields into the existing bookmark. */
	merge: async ({ request }) => {
		const form = await request.formData();
		const target = String(form.get('existingUrl') ?? '');
		if (!target) return fail(400, { message: 'Missing bookmark reference.' });
		await mergeIntoBookmark(target, readFields(form));
		return { merged: target };
	},

	update: async ({ request }) => {
		const form = await request.formData();
		const originalUrl = String(form.get('originalUrl') ?? '');
		if (!originalUrl) return fail(400, { message: 'Missing bookmark reference.' });
		try {
			await updateBookmark(originalUrl, readFields(form));
		} catch (err) {
			// e.g. the edited URL collides with another bookmark.
			return fail(409, { message: (err as Error).message });
		}
		return { updated: true };
	},

	delete: async ({ request }) => {
		const url = await formUrl(request);
		if (!url) return fail(400, { message: 'Missing URL.' });
		await deleteBookmark(url);
		return { deleted: true };
	},

	refresh: async ({ request }) => {
		const url = await formUrl(request);
		if (!url) return fail(400, { message: 'Missing URL.' });
		refreshMetadataInBackground(url);
		return { refreshed: url };
	}
};
