/**
 * Split a delimited string into a clean list of values, dropping blanks and
 * surrounding whitespace. Used for tag input (comma or newline separated) and for
 * the `TAGS="a,b"` attribute browsers write into exported bookmark files.
 */
export function splitList(raw: string | null | undefined, separators = /[,\n]/): string[] {
	if (typeof raw !== 'string') return [];
	return raw
		.split(separators)
		.map((value) => value.trim())
		.filter(Boolean);
}
