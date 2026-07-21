import type { Bookmark, NewBookmark } from '$lib/types';

/**
 * Turning submitted or imported input into stored fields. Separate from the
 * operations because every one of them shapes its input the same way, and the rules
 * for doing so — what counts as "not provided", what gets trimmed — are worth
 * stating once.
 */

/** Trim user-supplied fields; `undefined` means "not provided" (keep existing on update). */
export function trimFields(input: NewBookmark) {
	return {
		title: input.title?.trim() || undefined,
		tags: input.tags?.map((tag) => tag.trim()).filter(Boolean),
		collection: input.collection?.trim() || undefined,
		notes: input.notes?.trim() || undefined
	};
}

/**
 * Build a stored bookmark from user or imported input. `added` lets an import keep
 * the date the bookmark was originally created; otherwise it is created now.
 */
export function buildBookmark(url: string, input: NewBookmark, added?: string): Bookmark {
	const fields = trimFields(input);
	return {
		url,
		title: fields.title ?? url,
		tags: fields.tags ?? [],
		collection: fields.collection,
		notes: fields.notes,
		added: added ?? new Date().toISOString()
	};
}
