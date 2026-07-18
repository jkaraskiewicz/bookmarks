import { describe, it, expect } from 'vitest';
import { decodeEntities, escapeHtml } from './html';

describe('decodeEntities', () => {
	it('decodes the common named entities', () => {
		expect(decodeEntities('Tom &amp; Jerry')).toBe('Tom & Jerry');
		expect(decodeEntities('&lt;tag&gt;')).toBe('<tag>');
		expect(decodeEntities('&quot;quoted&quot;')).toBe('"quoted"');
		expect(decodeEntities('it&#39;s')).toBe("it's");
	});

	it('decodes numeric entities', () => {
		expect(decodeEntities('caf&#233;')).toBe('café');
	});

	it('decodes &amp; last, so an escaped entity survives', () => {
		// "&amp;lt;" means a literal "&lt;", not a "<".
		expect(decodeEntities('&amp;lt;')).toBe('&lt;');
	});

	it('trims surrounding whitespace', () => {
		expect(decodeEntities('  spaced  ')).toBe('spaced');
	});
});

describe('escapeHtml', () => {
	it('escapes the characters that would break markup', () => {
		expect(escapeHtml('a & b')).toBe('a &amp; b');
		expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
		expect(escapeHtml('say "hi"')).toBe('say &quot;hi&quot;');
	});

	it('escapes the ampersand first, so escapes are not double-encoded', () => {
		expect(escapeHtml('<')).toBe('&lt;');
		expect(escapeHtml('&lt;')).toBe('&amp;lt;');
	});

	it('round-trips through decodeEntities', () => {
		const raw = 'Tom & "Jerry" <cartoon>';
		expect(decodeEntities(escapeHtml(raw))).toBe(raw);
	});
});
