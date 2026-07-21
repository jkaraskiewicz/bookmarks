import { describe, it, expect } from 'vitest';
import { DomainError } from './errors';
import {
	optionalField,
	repeatedField,
	requiredField,
	requiredUpload,
	textField,
	upload
} from './form';

function formOf(entries: [string, string | File][]): FormData {
	const form = new FormData();
	for (const [name, value] of entries) form.append(name, value);
	return form;
}

describe('textField', () => {
	it('trims the value', () => {
		expect(textField(formOf([['title', '  Svelte  ']]), 'title')).toBe('Svelte');
	});

	it('is empty for a missing field', () => {
		expect(textField(formOf([]), 'title')).toBe('');
	});

	it('is empty when the field holds a file rather than text', () => {
		expect(textField(formOf([['title', new File(['x'], 'x.html')]]), 'title')).toBe('');
	});
});

describe('optionalField', () => {
	it('is undefined for a missing or blank field, so "not given" reads as such', () => {
		expect(optionalField(formOf([]), 'notes')).toBeUndefined();
		expect(optionalField(formOf([['notes', '   ']]), 'notes')).toBeUndefined();
	});

	it('gives the trimmed value when there is one', () => {
		expect(optionalField(formOf([['notes', ' hi ']]), 'notes')).toBe('hi');
	});
});

describe('requiredField', () => {
	it('gives the value when present', () => {
		expect(requiredField(formOf([['url', 'https://a.test']]), 'url', 'nope')).toBe(
			'https://a.test'
		);
	});

	it('throws a 400 carrying the given message when missing or blank', () => {
		for (const entries of [[], [['url', '  ']] as [string, string][]]) {
			expect(() => requiredField(formOf(entries), 'url', 'A URL is required.')).toThrow(
				DomainError
			);
			try {
				requiredField(formOf(entries), 'url', 'A URL is required.');
			} catch (err) {
				expect((err as DomainError).message).toBe('A URL is required.');
				expect((err as DomainError).status).toBe(400);
			}
		}
	});
});

describe('repeatedField', () => {
	it('collects every value of a repeated field', () => {
		const form = formOf([
			['url', 'a'],
			['url', 'b']
		]);
		expect(repeatedField(form, 'url')).toEqual(['a', 'b']);
	});

	it('drops empties rather than passing blanks downstream', () => {
		const form = formOf([
			['url', 'a'],
			['url', '']
		]);
		expect(repeatedField(form, 'url')).toEqual(['a']);
	});

	it('is empty when the field was not submitted', () => {
		expect(repeatedField(formOf([]), 'url')).toEqual([]);
	});
});

describe('upload', () => {
	it('gives the upload when one was chosen', () => {
		const chosen = new File(['<html>'], 'bookmarks.html');
		expect(upload(formOf([['file', chosen]]), 'file')).toBe(chosen);
	});

	it('treats an empty upload as no upload — browsers submit one for an empty picker', () => {
		expect(upload(formOf([['file', new File([], 'empty.html')]]), 'file')).toBeUndefined();
	});

	it('is undefined when the field holds text', () => {
		expect(upload(formOf([['file', 'not a file']]), 'file')).toBeUndefined();
	});

	it('throws a 400 from requiredUpload when absent', () => {
		expect(() => requiredUpload(formOf([]), 'file', 'Choose a file.')).toThrow('Choose a file.');
	});
});
