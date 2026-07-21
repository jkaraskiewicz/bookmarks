import { describe, it, expect } from 'vitest';
import { choiceById, storedChoice } from './choice';

const IDS = ['a', 'b'] as const;

describe('storedChoice', () => {
	it('keeps a value the build still offers', () => {
		expect(storedChoice(IDS, 'b', 'a')).toBe('b');
	});

	it('falls back for a value an older build wrote', () => {
		// The case this exists for: a stored id that no longer means anything.
		expect(storedChoice(IDS, 'removed-in-a-later-build', 'a')).toBe('a');
	});

	it('falls back for a missing or non-string value', () => {
		expect(storedChoice(IDS, null, 'a')).toBe('a');
		expect(storedChoice(IDS, 7, 'a')).toBe('a');
		expect(storedChoice(IDS, undefined, 'a')).toBe('a');
	});
});

describe('choiceById', () => {
	const choices = [
		{ id: 'a', label: 'A' },
		{ id: 'b', label: 'B' }
	];

	it('finds the entry', () => {
		expect(choiceById(choices, 'b')?.label).toBe('B');
	});

	it('gives nothing for an unknown id', () => {
		expect(choiceById(choices, 'c')).toBeUndefined();
	});
});
