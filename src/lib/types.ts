/**
 * A single bookmark. Mirrors one `[[bookmark]]` table in `bookmarks.toml`.
 * The TOML file is the source of truth; this is the in-app representation.
 */
export interface Bookmark {
	/** Canonical URL. Acts as the natural identity / unique key. */
	url: string;
	/** Display title. Falls back to fetched `<title>`, then the URL. */
	title: string;
	/** Free-form tags (many per bookmark). */
	tags: string[];
	/** Optional single collection/folder, may be nested with `/` e.g. `Dev/Frameworks`. */
	collection?: string;
	/** Free-form personal notes. */
	notes?: string;
	/** Auto-fetched page description (meta / OpenGraph). */
	description?: string;
	/** Favicon URL — auto-fetched, or set by hand when the fetch cannot find one. */
	favicon?: string;
	/** ISO-8601 timestamp of when the bookmark was added. */
	added: string;
}

/** Fields a user (or hand-editor) supplies when creating a bookmark. */
export interface NewBookmark {
	url: string;
	title?: string;
	tags?: string[];
	collection?: string;
	notes?: string;
	/** Only the edit form supplies this; adding and importing leave it to the fetcher. */
	favicon?: string;
}

/** Metadata discovered by fetching the page. */
export interface PageMetadata {
	title?: string;
	description?: string;
	favicon?: string;
}
