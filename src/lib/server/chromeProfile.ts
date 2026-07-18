import { homedir } from 'node:os';
import { join } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
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

export interface ChromeProfile {
	/** Directory name, e.g. "Default" or "Profile 1". Used as the form value. */
	dir: string;
	/** Number of bookmarks the profile holds. */
	count: number;
}

/** A directory is a Chrome profile if it contains a "Bookmarks" file. */
async function hasBookmarks(dir: string): Promise<boolean> {
	try {
		await readFile(join(chromeUserDataDir(), dir, 'Bookmarks'), 'utf-8');
		return true;
	} catch {
		return false;
	}
}

/** Read one profile's raw Bookmarks JSON. Throws if the profile has none. */
export function readChromeBookmarksJson(profileDir: string): Promise<string> {
	// Guard against path traversal from the submitted form value.
	const safe = profileDir.replace(/[/\\]/g, '');
	return readFile(join(chromeUserDataDir(), safe, 'Bookmarks'), 'utf-8');
}

/** Discover Chrome profiles that have bookmarks. Empty when Chrome isn't installed. */
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
		if (!(await hasBookmarks(dir))) continue;
		const json = await readChromeBookmarksJson(dir);
		profiles.push({ dir, count: countLinks(json) });
	}

	return profiles;
}

/** Cheap link count without building the full item list. */
function countLinks(json: string): number {
	return (json.match(/"type":\s*"url"/g) ?? []).length;
}
