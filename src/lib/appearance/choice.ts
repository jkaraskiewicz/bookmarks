/**
 * A setting the user picks from a fixed list, remembered in `localStorage`.
 *
 * Theme, font and font size are all this shape, and all face the same problem: the
 * stored value is whatever was written last, which may be from an older build that
 * offered a choice this one does not. Reading it therefore has to validate rather
 * than trust — otherwise a stale value is applied verbatim, nothing matches, and the
 * page corrects itself a frame later.
 */

/** Something offerable in a picker: an id to store, and a name to show. */
export interface Choice {
	id: string;
	label: string;
}

/** Coerce an unknown stored value into one of `ids`, falling back when it is not. */
export function storedChoice<T extends string>(ids: readonly T[], value: unknown, fallback: T): T {
	return typeof value === 'string' && (ids as readonly string[]).includes(value)
		? (value as T)
		: fallback;
}

/** The entry with this id, for reading a choice's label or its other fields. */
export function choiceById<T extends Choice>(choices: readonly T[], id: string): T | undefined {
	return choices.find((choice) => choice.id === id);
}
