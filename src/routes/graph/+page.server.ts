import type { PageServerLoad } from './$types';
import { readBookmarks } from '$lib/server/repository';

export const load: PageServerLoad = async () => {
	return { bookmarks: await readBookmarks() };
};
