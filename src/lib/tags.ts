/**
 * Roughly how wide, in characters, the tag strip of a list row may get before the
 * rest collapse behind a `+N` chip. A width budget rather than a count of tags:
 * four short tags fit on one line where two long ones do not, and counting tags
 * would force the long ones to truncate into unreadable stubs.
 *
 * Deliberately approximate. Fitting the box exactly would mean measuring rendered
 * text per row; this keeps the rule pure, testable and identical for every row.
 */
export const TAG_ROW_BUDGET = 32;

/** A chip is wider than its text: the `#`, the padding, and the gap after it. */
const TAG_CHIP_OVERHEAD = 3;

export interface TagOverflow {
	/** Tags to render as chips. */
	visible: string[];
	/** Tags folded into the `+N` chip; empty when everything fits. */
	hidden: string[];
}

/**
 * Split a bookmark's tags into the ones a row shows and the ones it folds away,
 * keeping the row one line tall. The first tag is always shown, however long it
 * is — a row of nothing but a `+N` chip says less than a truncated tag does.
 */
export function splitTagsForRow(tags: string[], budget = TAG_ROW_BUDGET): TagOverflow {
	let used = 0;
	let fit = 0;
	for (const tag of tags) {
		const width = tag.length + TAG_CHIP_OVERHEAD;
		if (fit > 0 && used + width > budget) break;
		used += width;
		fit++;
	}
	return { visible: tags.slice(0, fit), hidden: tags.slice(fit) };
}

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
