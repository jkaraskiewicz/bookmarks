import { exactKey } from '$lib/dedupe';
import type { ImportItem } from './types';

export interface ImportOptions {
	/** Prepended to each item's collection, e.g. "Imported" → "Imported/Dev". */
	collectionPrefix?: string;
	/** Added to every imported item on top of whatever the source provided. */
	extraTags?: string[];
	/** Keep only items whose collection is, or sits under, this path. */
	onlyCollection?: string;
}

/** Join collection path segments, dropping empties. */
function joinPath(...parts: (string | undefined)[]): string | undefined {
	return parts.filter((p) => p?.trim()).join('/') || undefined;
}

/** True when `path` is `root` itself, or nested beneath it. */
function isWithin(path: string | undefined, root: string): boolean {
	const value = path ?? '';
	return value === root || value.startsWith(`${root}/`);
}

/**
 * Apply the user's import options to parsed items — folder scope, collection prefix
 * and extra tags — and drop repeats within the batch itself, since browsers happily
 * file one page in two folders.
 */
export function applyImportOptions(items: ImportItem[], options: ImportOptions = {}): ImportItem[] {
	const { collectionPrefix, extraTags = [], onlyCollection } = options;
	const seenKeys = new Set<string>();
	const prepared: ImportItem[] = [];

	for (const item of items) {
		if (onlyCollection && !isWithin(item.collection, onlyCollection)) continue;
		// Same page twice in one file (browsers file a page in two folders): keep the first.
		const key = exactKey(item.url);
		if (seenKeys.has(key)) continue;
		seenKeys.add(key);

		prepared.push({
			...item,
			collection: joinPath(collectionPrefix, item.collection),
			tags: [...new Set([...(item.tags ?? []), ...extraTags])]
		});
	}

	return prepared;
}
