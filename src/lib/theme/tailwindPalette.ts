/**
 * Tailwind v4's palette, which a theme may reference by name rather than restating
 * a colour (`var(--color-neutral-900)`).
 *
 * A copy, because Tailwind ships these as generated CSS rather than as data we can
 * import. Only the entries actually in use are here. If Tailwind restates its
 * palette this goes stale — the contrast tests are what would say so, since the
 * numbers they check would move.
 *
 * Node-only: used by tests, not shipped to the browser.
 */
export const TAILWIND: Record<string, string> = {
	'neutral-50': 'oklch(0.985 0 0)',
	'neutral-100': 'oklch(0.97 0 0)',
	'neutral-200': 'oklch(0.922 0 0)',
	'neutral-300': 'oklch(0.87 0 0)',
	'neutral-400': 'oklch(0.708 0 0)',
	'neutral-500': 'oklch(0.556 0 0)',
	'neutral-600': 'oklch(0.439 0 0)',
	'neutral-700': 'oklch(0.371 0 0)',
	'neutral-800': 'oklch(0.269 0 0)',
	'neutral-900': 'oklch(0.205 0 0)',
	'neutral-950': 'oklch(0.145 0 0)',
	'blue-400': 'oklch(0.707 0.165 254.624)',
	'blue-500': 'oklch(0.623 0.214 259.815)',
	'blue-600': 'oklch(0.546 0.245 262.881)',
	'blue-700': 'oklch(0.488 0.243 264.376)',
	'red-400': 'oklch(0.704 0.191 22.216)',
	'red-600': 'oklch(0.577 0.245 27.325)',
	'amber-50': 'oklch(0.987 0.022 95.277)',
	'amber-300': 'oklch(0.879 0.169 91.605)',
	'amber-800': 'oklch(0.473 0.137 46.201)',
	'amber-950': 'oklch(0.279 0.077 45.635)',
	'green-50': 'oklch(0.982 0.018 155.826)',
	'green-300': 'oklch(0.871 0.15 154.449)',
	'green-800': 'oklch(0.448 0.119 151.328)',
	'green-950': 'oklch(0.266 0.065 152.934)',
	'emerald-600': 'oklch(0.596 0.145 163.225)',
	'emerald-700': 'oklch(0.508 0.118 165.612)',
	'sky-600': 'oklch(0.588 0.158 241.966)',
	'sky-700': 'oklch(0.5 0.134 242.749)'
};
