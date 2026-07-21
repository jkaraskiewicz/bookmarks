import type { Actions, PageServerLoad } from './$types';
import type { ImportItem, ImportSummary } from '$lib/import/types';
import { parseNetscape } from '$lib/import/netscape';
import { parseChromeBookmarks, folderCounts } from '$lib/import/chromeJson';
import { parseUrlList } from '$lib/import/urlList';
import { applyImportOptions, type ImportOptions } from '$lib/import/prepare';
import { splitList } from '$lib/tags';
import { addBookmarks } from '$lib/server/repository';
import { listChromeProfiles, readChromeBookmarksJson } from '$lib/server/chromeProfile';
import { refreshMetadataInBackground } from '$lib/server/enrichment';
import { guard } from '$lib/server/action';
import { invalid } from '$lib/server/errors';
import { optionalField, requiredField, requiredUpload, textField } from '$lib/server/form';

/** The options every import form carries: where to file the results, and how to tag them. */
function readOptions(form: FormData): ImportOptions {
	return {
		collectionPrefix: optionalField(form, 'collectionPrefix'),
		extraTags: splitList(textField(form, 'extraTags')),
		onlyCollection: optionalField(form, 'onlyCollection')
	};
}

/** Shared tail of every import action: prepare, persist, kick off enrichment. */
async function runImport(items: ImportItem[], options: ImportOptions) {
	const prepared = applyImportOptions(items, options);
	if (prepared.length === 0) throw invalid('Nothing to import — no usable bookmarks found.');

	const summary: ImportSummary = await addBookmarks(prepared);

	// Imported entries have a title but no description or icon. Hand the lot to the
	// enrichment queue, which paces the fetching; previously this enriched only the
	// first 25 and silently left the rest bare.
	for (const item of prepared) refreshMetadataInBackground(item.url);

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
	file: ({ request }) =>
		guard(async () => {
			const form = await request.formData();
			const upload = requiredUpload(form, 'file', 'Choose a bookmarks HTML file to upload.');
			return runImport(parseNetscape(await upload.text()), readOptions(form));
		}),

	/** Import straight from a local Chrome profile's live bookmarks. */
	profile: ({ request }) =>
		guard(async () => {
			const form = await request.formData();
			const profileDir = requiredField(form, 'profile', 'Choose a Chrome profile.');

			const json = await readChromeBookmarksJson(profileDir).catch(() => {
				throw invalid(`Could not read bookmarks for profile "${profileDir}".`);
			});
			return runImport(parseChromeBookmarks(json), readOptions(form));
		}),

	/** Import a pasted list of URLs (one per line) — the open-tabs path. */
	paste: ({ request }) =>
		guard(async () => {
			const form = await request.formData();
			const urls = requiredField(form, 'urls', 'Paste at least one URL.');
			return runImport(parseUrlList(urls), readOptions(form));
		})
};
