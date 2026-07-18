import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { ImportItem, ImportSummary } from '$lib/import/types';
import { parseNetscape } from '$lib/import/netscape';
import { parseChromeBookmarks, folderCounts } from '$lib/import/chromeJson';
import { parseUrlList } from '$lib/import/urlList';
import { prepareItems, type ImportOptions } from '$lib/import/prepare';
import { addBookmarks } from '$lib/server/repository';
import { listChromeProfiles, readChromeBookmarksJson } from '$lib/server/chromeProfile';
import { refreshMetadataInBackground } from '$lib/server/enrichment';

/** How many freshly imported bookmarks we enrich right away, to avoid a fetch storm. */
const ENRICH_LIMIT = 25;

function parseTags(raw: FormDataEntryValue | null): string[] {
	if (typeof raw !== 'string') return [];
	return raw
		.split(/[,\n]/)
		.map((t) => t.trim())
		.filter(Boolean);
}

function readOptions(form: FormData): ImportOptions {
	return {
		collectionPrefix: String(form.get('collectionPrefix') ?? '').trim() || undefined,
		extraTags: parseTags(form.get('extraTags')),
		onlyCollection: String(form.get('onlyCollection') ?? '').trim() || undefined
	};
}

/** Shared tail of every import action: prepare, persist, kick off enrichment. */
async function runImport(items: ImportItem[], options: ImportOptions) {
	const prepared = prepareItems(items, options);
	if (prepared.length === 0) {
		return fail(400, { message: 'Nothing to import — no usable bookmarks found.' });
	}

	const summary: ImportSummary = await addBookmarks(prepared);

	// Imported entries have a title but no description/favicon; fill the first batch in.
	for (const item of prepared.slice(0, ENRICH_LIMIT)) {
		refreshMetadataInBackground(item.url);
	}

	return { summary };
}

export const load: PageServerLoad = async () => {
	// Read and parse each profile exactly once, deriving both its bookmark count and
	// its folder list from that single parse.
	const found = await listChromeProfiles();
	const profiles = await Promise.all(
		found.map(async ({ dir }) => {
			const items = parseChromeBookmarks(await readChromeBookmarksJson(dir));
			return { dir, count: items.length, folders: folderCounts(items) };
		})
	);

	return {
		profiles: profiles.map(({ dir, count }) => ({ dir, count })),
		// The first profile's folders, so "Bookmark all tabs" folders are pickable.
		folders: profiles[0]?.folders ?? []
	};
};

export const actions: Actions = {
	/** Import from an exported bookmarks HTML file (Chrome, Firefox, Safari, Edge). */
	file: async ({ request }) => {
		const form = await request.formData();
		const upload = form.get('file');
		if (!(upload instanceof File) || upload.size === 0) {
			return fail(400, { message: 'Choose a bookmarks HTML file to upload.' });
		}
		return runImport(parseNetscape(await upload.text()), readOptions(form));
	},

	/** Import straight from a local Chrome profile's live bookmarks. */
	profile: async ({ request }) => {
		const form = await request.formData();
		const profileDir = String(form.get('profile') ?? '');
		if (!profileDir) return fail(400, { message: 'Choose a Chrome profile.' });

		try {
			const json = await readChromeBookmarksJson(profileDir);
			return runImport(parseChromeBookmarks(json), readOptions(form));
		} catch {
			return fail(400, { message: `Could not read bookmarks for profile "${profileDir}".` });
		}
	},

	/** Import a pasted list of URLs (one per line) — the open-tabs path. */
	paste: async ({ request }) => {
		const form = await request.formData();
		const text = String(form.get('urls') ?? '');
		if (!text.trim()) return fail(400, { message: 'Paste at least one URL.' });
		return runImport(parseUrlList(text), readOptions(form));
	}
};
