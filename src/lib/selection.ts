/**
 * How a "select all" checkbox behaves over a filtered list.
 *
 * The subtlety is that "all" means *what you can currently see*, not the whole
 * library — selecting everything and then deleting should never reach past the filter
 * you have applied. Selection itself survives filtering, so the count in the toolbar
 * can exceed what is on screen; that is deliberate and the toolbar says so.
 */

/** State of a tri-state select-all checkbox. */
export type SelectAllState = 'none' | 'some' | 'all';

/** Whether none, some, or all of `visible` is selected. */
export function selectAllState(visible: string[], selected: ReadonlySet<string>): SelectAllState {
	if (visible.length === 0) return 'none';

	let count = 0;
	for (const key of visible) if (selected.has(key)) count++;

	if (count === 0) return 'none';
	return count === visible.length ? 'all' : 'some';
}

/**
 * The selection after clicking select-all. Anything currently hidden by a filter is
 * left exactly as it was — the click speaks only about what is on screen.
 */
export function toggleAll(visible: string[], selected: ReadonlySet<string>): Set<string> {
	const next = new Set(selected);
	// Partial counts as "not yet all", so the click completes the set rather than
	// clearing it — the same as every file manager.
	if (selectAllState(visible, selected) === 'all') {
		for (const key of visible) next.delete(key);
	} else {
		for (const key of visible) next.add(key);
	}
	return next;
}

/** The selection with one entry flipped. */
export function toggleOne(key: string, selected: ReadonlySet<string>): Set<string> {
	const next = new Set(selected);
	if (!next.delete(key)) next.add(key);
	return next;
}

/**
 * Drop anything no longer present. Deleting bookmarks, or an edit that changes a URL,
 * would otherwise leave the selection holding keys that no longer exist and the count
 * reporting more than there is.
 */
export function pruneSelection(selected: ReadonlySet<string>, existing: string[]): Set<string> {
	const alive = new Set(existing);
	return new Set([...selected].filter((key) => alive.has(key)));
}

/** How many selected entries are not currently on screen. */
export function hiddenSelectedCount(visible: string[], selected: ReadonlySet<string>): number {
	const shown = new Set(visible);
	let hidden = 0;
	for (const key of selected) if (!shown.has(key)) hidden++;
	return hidden;
}
