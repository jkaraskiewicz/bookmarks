/**
 * Shared Tailwind class strings for the dark theme.
 *
 * Constants rather than wrapper components: the markup varies (button, anchor,
 * submit inside a form), so a component would need a prop per variation while a
 * class string composes freely.
 */

/** Form control without a width, for when a flex parent controls it. */
export const inputBase =
	'rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-blue-500';

/** Full-width form control — the common case. */
export const fieldClass = `w-full ${inputBase}`;

/** Filled call-to-action: Add, Save, Import. */
export const primaryButton =
	'rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500';

/** Outlined secondary action sitting next to a primary one. */
export const secondaryButton =
	'rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800';

/** Low-emphasis action: "More +", Cancel, header links. */
export const ghostButton =
	'rounded-md px-3 py-1.5 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100';

/** Small square icon button, e.g. the per-row refresh and delete controls. */
export const iconButton =
	'inline-flex h-6 w-6 items-center justify-center rounded text-xs leading-none text-neutral-400 hover:bg-neutral-800';

/** Panel used to group a block of related content. */
export const cardClass = 'rounded-lg border border-neutral-800 bg-neutral-950/40 p-5';
