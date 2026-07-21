import { describe, it, expect } from 'vitest';
import { appendParagraph } from './notes';

describe('appendParagraph', () => {
	it('fills empty notes with the addition alone', () => {
		expect(appendParagraph('', 'A description.')).toBe('A description.');
		expect(appendParagraph('   ', 'A description.')).toBe('A description.');
	});

	it('adds a paragraph below what is already there', () => {
		expect(appendParagraph('Mine.', 'Theirs.')).toBe('Mine.\n\nTheirs.');
	});

	it('does not add the same text twice', () => {
		// The button is there to be pressed; pressing it again should be a no-op.
		const once = appendParagraph('Mine.', 'Theirs.');
		expect(appendParagraph(once, 'Theirs.')).toBe(once);
	});

	it('leaves notes alone when there is nothing to add', () => {
		expect(appendParagraph('Mine.', '')).toBe('Mine.');
		expect(appendParagraph('Mine.', '   ')).toBe('Mine.');
	});

	it('trims stray whitespace off both sides', () => {
		expect(appendParagraph('  Mine.  ', '  Theirs.  ')).toBe('Mine.\n\nTheirs.');
	});

	it('is empty when both are', () => {
		expect(appendParagraph('', '')).toBe('');
	});
});
