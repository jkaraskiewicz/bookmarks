import { describe, it, expect } from 'vitest';
import {
	hiddenSelectedCount,
	pruneSelection,
	selectAllState,
	toggleAll,
	toggleOne
} from './selection';

const set = (...keys: string[]) => new Set(keys);

describe('selectAllState', () => {
	it('reports none, some or all of what is visible', () => {
		expect(selectAllState(['a', 'b'], set())).toBe('none');
		expect(selectAllState(['a', 'b'], set('a'))).toBe('some');
		expect(selectAllState(['a', 'b'], set('a', 'b'))).toBe('all');
	});

	it('ignores selected entries that are filtered out', () => {
		// `c` is selected but not on screen: the checkbox speaks only about a and b.
		expect(selectAllState(['a', 'b'], set('a', 'b', 'c'))).toBe('all');
		expect(selectAllState(['a', 'b'], set('c'))).toBe('none');
	});

	it('is "none" when there is nothing to select', () => {
		expect(selectAllState([], set('a'))).toBe('none');
	});
});

describe('toggleAll', () => {
	it('selects everything visible when nothing is', () => {
		expect(toggleAll(['a', 'b'], set())).toEqual(set('a', 'b'));
	});

	it('completes the set when only some are selected', () => {
		// Partial means "not yet all", so clicking finishes the job rather than clearing.
		expect(toggleAll(['a', 'b'], set('a'))).toEqual(set('a', 'b'));
	});

	it('clears the visible ones when all are selected', () => {
		expect(toggleAll(['a', 'b'], set('a', 'b'))).toEqual(set());
	});

	it('never touches selected entries hidden by a filter', () => {
		// Selecting all of a filtered view must not reach past the filter, and
		// clearing it must not silently drop things you cannot see.
		expect(toggleAll(['a'], set('hidden'))).toEqual(set('hidden', 'a'));
		expect(toggleAll(['a'], set('a', 'hidden'))).toEqual(set('hidden'));
	});

	it('leaves the original untouched', () => {
		const original = set('a');
		toggleAll(['a', 'b'], original);
		expect(original).toEqual(set('a'));
	});
});

describe('toggleOne', () => {
	it('adds when absent and removes when present', () => {
		expect(toggleOne('a', set())).toEqual(set('a'));
		expect(toggleOne('a', set('a'))).toEqual(set());
	});

	it('leaves the rest alone', () => {
		expect(toggleOne('b', set('a'))).toEqual(set('a', 'b'));
	});
});

describe('pruneSelection', () => {
	it('drops keys that no longer exist', () => {
		// After deleting `b`, the selection must not keep counting it.
		expect(pruneSelection(set('a', 'b'), ['a'])).toEqual(set('a'));
	});

	it('keeps everything still present', () => {
		expect(pruneSelection(set('a', 'b'), ['a', 'b', 'c'])).toEqual(set('a', 'b'));
	});

	it('empties when nothing survives', () => {
		expect(pruneSelection(set('a'), [])).toEqual(set());
	});
});

describe('hiddenSelectedCount', () => {
	it('counts selected entries the filter is hiding', () => {
		expect(hiddenSelectedCount(['a'], set('a', 'b', 'c'))).toBe(2);
	});

	it('is zero when everything selected is on screen', () => {
		expect(hiddenSelectedCount(['a', 'b'], set('a'))).toBe(0);
	});
});
