/**
 * Folding a page's own description into your notes.
 *
 * The description is fetched and read-only; notes are yours. Copying one into the
 * other is how a machine-written sentence becomes something you have adopted and can
 * then edit — so the copy appends rather than replaces, and never lands twice.
 */

/** Paragraphs are separated by a blank line, matching how the notes field reads. */
const PARAGRAPH_BREAK = '\n\n';

/**
 * Append `addition` to `existing`, as a new paragraph.
 *
 * Returns `existing` unchanged when there is nothing to add or when it is already
 * there — pressing the button twice should not double the text.
 */
export function appendParagraph(existing: string, addition: string): string {
	const note = existing.trim();
	const extra = addition.trim();

	if (!extra || note.includes(extra)) return note;
	if (!note) return extra;
	return `${note}${PARAGRAPH_BREAK}${extra}`;
}
