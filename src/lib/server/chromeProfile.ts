import { homedir } from 'node:os';
import { join } from 'node:path';
import { readdir, readFile, access } from 'node:fs/promises';
import { env } from '$env/dynamic/private';

/** Where Chrome keeps its user data, per platform. */
function chromeUserDataDir(): string {
	if (env.CHROME_USER_DATA_DIR?.trim()) return env.CHROME_USER_DATA_DIR.trim();

	const home = homedir();
	switch (process.platform) {
		case 'darwin':
			return join(home, 'Library', 'Application Support', 'Google', 'Chrome');
		case 'win32':
			return join(
				env.LOCALAPPDATA || join(home, 'AppData', 'Local'),
				'Google',
				'Chrome',
				'User Data'
			);
		default:
			return join(home, '.config', 'google-chrome');
	}
}

function bookmarksPath(profileDir: string): string {
	// Guard against path traversal from a submitted form value.
	return join(chromeUserDataDir(), profileDir.replace(/[/\\]/g, ''), 'Bookmarks');
}

export interface ChromeProfile {
	/** Directory name, e.g. "Default" or "Profile 1". Used as the form value. */
	dir: string;
}

/** Read one profile's raw Bookmarks JSON. Throws if the profile has none. */
export function readChromeBookmarksJson(profileDir: string): Promise<string> {
	return readFile(bookmarksPath(profileDir), 'utf-8');
}

/**
 * Discover Chrome profiles that have a bookmarks file. Empty when Chrome isn't
 * installed. Only checks for the file's existence — callers that need the contents
 * read it once themselves, rather than having it read here and again later.
 */
export async function listChromeProfiles(): Promise<ChromeProfile[]> {
	let entries: string[];
	try {
		entries = await readdir(chromeUserDataDir());
	} catch {
		return []; // no Chrome on this machine
	}

	const candidates = entries.filter((e) => e === 'Default' || /^Profile \d+$/.test(e));
	const profiles: ChromeProfile[] = [];

	for (const dir of candidates) {
		try {
			await access(bookmarksPath(dir));
			profiles.push({ dir });
		} catch {
			// no Bookmarks file in this directory; not a usable profile
		}
	}

	return profiles;
}
