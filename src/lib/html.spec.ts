import { describe, it, expect } from 'vitest';
import { attributeValue, decodeEntities, escapeHtml } from './html';

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

describe('attributeValue', () => {
	it('reads double- and single-quoted values alike', () => {
		expect(attributeValue('<link rel="icon" href="/a.png">', 'href')).toBe('/a.png');
		expect(attributeValue("<link rel='icon' href='/a.png'>", 'href')).toBe('/a.png');
	});

	it('tolerates spaces around the equals sign', () => {
		expect(attributeValue('<meta content = "hi">', 'content')).toBe('hi');
	});

	it('matches the attribute name case-insensitively', () => {
		expect(attributeValue('<a HREF="/x">', 'href')).toBe('/x');
	});

	it('gives undefined when the attribute is absent', () => {
		expect(attributeValue('<link rel="icon">', 'href')).toBeUndefined();
	});

	it('gives an empty string for an empty value, distinguishing it from absent', () => {
		expect(attributeValue('<link href="">', 'href')).toBe('');
	});

	it('does not match an attribute whose name merely ends with the one asked for', () => {
		// `data-href` must not answer a request for `href`.
		expect(attributeValue('<a data-href="/wrong">', 'href')).toBeUndefined();
	});

	it('leaves entities encoded for the caller to decode', () => {
		expect(attributeValue('<a href="/a?x=1&amp;y=2">', 'href')).toBe('/a?x=1&amp;y=2');
	});
});
