/**
 * Colour maths for checking a theme is legible.
 *
 * Themes are written in oklch/oklab (what Tailwind's palette uses), but WCAG contrast
 * is defined on sRGB luminance — so a theme cannot be checked by eye or by comparing
 * lightness values. These conversions let a test do it properly.
 */

export interface Rgb {
	r: number;
	g: number;
	b: number;
	/** 0–1. Anything below 1 must be composited before measuring. */
	a: number;
}

/** oklab → sRGB, both in the 0–255 range with the usual gamma encoding. */
export function oklabToRgb(L: number, a: number, b: number, alpha = 1): Rgb {
	const lRoot = L + 0.3963377774 * a + 0.2158037573 * b;
	const mRoot = L - 0.1055613458 * a - 0.0638541728 * b;
	const sRoot = L - 0.0894841775 * a - 1.291485548 * b;

	const l = lRoot ** 3;
	const m = mRoot ** 3;
	const s = sRoot ** 3;

	const linear = [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
	];

	const [r, g, blue] = linear.map(encodeGamma);
	return { r, g, b: blue, a: alpha };
}

/** oklch is oklab in polar form. */
export function oklchToRgb(L: number, chroma: number, hue: number, alpha = 1): Rgb {
	const radians = (hue * Math.PI) / 180;
	return oklabToRgb(L, chroma * Math.cos(radians), chroma * Math.sin(radians), alpha);
}

function encodeGamma(channel: number): number {
	const clamped = Math.min(1, Math.max(0, channel));
	const encoded = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
	return encoded * 255;
}

/** Composite a translucent colour onto an opaque one. */
export function composite(foreground: Rgb, background: Rgb): Rgb {
	if (foreground.a >= 1) return foreground;
	const blend = (from: number, onto: number) => from * foreground.a + onto * (1 - foreground.a);
	return {
		r: blend(foreground.r, background.r),
		g: blend(foreground.g, background.g),
		b: blend(foreground.b, background.b),
		a: 1
	};
}

/** Relative luminance, per WCAG 2.1. */
export function luminance({ r, g, b }: Rgb): number {
	const channel = (value: number) => {
		const scaled = value / 255;
		return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1 (identical) to 21 (black on white). */
export function contrastRatio(foreground: Rgb, background: Rgb): number {
	const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
	return (lighter + 0.05) / (darker + 0.05);
}

/** Parse the colour notations a palette may use: `oklch()`, `oklab()`, `#rgb`, `rgb()`. */
export function parseColor(css: string): Rgb {
	const value = css.trim();

	const functional = /^(oklch|oklab)\(([^)]*)\)$/i.exec(value);
	if (functional) {
		const [, kind, body] = functional;
		const [channels, alphaPart] = body.split('/');
		const parts = channels
			.trim()
			.split(/[\s,]+/)
			.filter((part) => part && part !== 'none')
			.map(Number);
		const alpha = alphaPart === undefined ? 1 : Number(alphaPart.trim());
		const [first, second, third = 0] = parts;
		return kind.toLowerCase() === 'oklch'
			? oklchToRgb(first, second, third, alpha)
			: oklabToRgb(first, second, third, alpha);
	}

	const hex = /^#([0-9a-f]{6})$/i.exec(value);
	if (hex) {
		const int = parseInt(hex[1], 16);
		return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255, a: 1 };
	}

	const rgb = /^rgba?\(([^)]*)\)$/i.exec(value);
	if (rgb) {
		const [r, g, b, a = 1] = rgb[1]
			.split(/[\s,/]+/)
			.filter(Boolean)
			.map(Number);
		return { r, g, b, a };
	}

	if (value === 'white') return { r: 255, g: 255, b: 255, a: 1 };
	if (value === 'black') return { r: 0, g: 0, b: 0, a: 1 };

	throw new Error(`Cannot parse colour: ${css}`);
}
