import { homedir } from 'node:os';
import { join } from 'node:path';
import { env } from '$env/dynamic/private';

/** Absolute path to bookmarks.toml — overridable via the BOOKMARKS_FILE env var. */
export function bookmarksFile(): string {
	return env.BOOKMARKS_FILE?.trim() || join(homedir(), '.bookmarks', 'bookmarks.toml');
}
