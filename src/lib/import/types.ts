import type { NewBookmark } from '$lib/types';

/**
 * A bookmark coming from an external source. Same shape a user would type, plus an
 * optional original creation time (browsers record one; we preserve it).
 */
export interface ImportItem extends NewBookmark {
	/** ISO timestamp of when the bookmark was originally created, if the source knows. */
	added?: string;
}

/** Outcome of an import run. */
export interface ImportSummary {
	added: number;
	skipped: number;
}
