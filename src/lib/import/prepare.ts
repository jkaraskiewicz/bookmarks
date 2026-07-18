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

/** True when `path` is `scope` itself or nested beneath it. */
function withinScope(path: string | undefined, scope: string): boolean {
	const value = path ?? '';
	return value === scope || value.startsWith(`${scope}/`);
}

/**
 * Apply the user's import options to parsed items, and drop duplicate URLs within
 * the batch itself (browsers happily bookmark the same page in two folders).
 */
export function prepareItems(items: ImportItem[], options: ImportOptions = {}): ImportItem[] {
	const { collectionPrefix, extraTags = [], onlyCollection } = options;
	const seen = new Set<string>();
	const prepared: ImportItem[] = [];

	for (const item of items) {
		if (onlyCollection && !withinScope(item.collection, onlyCollection)) continue;
		if (seen.has(item.url)) continue;
		seen.add(item.url);

		prepared.push({
			...item,
			collection: joinPath(collectionPrefix, item.collection),
			tags: [...new Set([...(item.tags ?? []), ...extraTags])]
		});
	}

	return prepared;
}
