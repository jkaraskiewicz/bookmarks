import type { RequestHandler } from './$types';
import { readBookmarks } from '$lib/server/repository';
import { serializeNetscape } from '$lib/import/netscape';

/** Download all bookmarks as a Netscape HTML file, importable by any browser. */
export const GET: RequestHandler = async () => {
	const html = serializeNetscape(await readBookmarks());
	const date = new Date().toISOString().slice(0, 10);

	return new Response(html, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'content-disposition': `attachment; filename="bookmarks-${date}.html"`
		}
	});
};
