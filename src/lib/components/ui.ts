/**
 * Shared Tailwind class strings.
 *
 * Constants rather than wrapper components: the markup varies (button, anchor,
 * submit inside a form), so a component would need a prop per variation while a
 * class string composes freely.
 *
 * Every colour here is a theme role (`bg-surface`, `text-muted`) rather than a
 * palette value, so these follow whichever theme is showing.
 */

/** Form control without a width, for when a flex parent controls it. */
export const inputBase =
	'rounded-md border border-line bg-elevated px-3 py-1.5 text-sm text-content outline-none placeholder:text-faint focus:border-focus';

/** Full-width form control — the common case. */
export const field = `w-full ${inputBase}`;

/** The page frame every route sits in. */
export const pageShell = 'bg-canvas text-content';

/** The bar across the top of every route. */
export const pageHeader = 'border-b border-subtle bg-surface px-6 py-4';

/** Filled call-to-action: Add, Save, Import. */
export const primaryButton =
	'rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-on-accent hover:bg-accent-hover';

/** Outlined secondary action sitting next to a primary one. */
export const secondaryButton =
	'rounded-md border border-line px-3 py-1.5 text-sm text-content hover:bg-elevated';

/** Low-emphasis action: "More +", Cancel, header links. */
export const ghostButton =
	'rounded-md px-3 py-1.5 text-sm text-muted hover:bg-elevated hover:text-content';

/** Small square icon button, e.g. the per-row refresh and delete controls. */
export const iconButton =
	'inline-flex h-6 w-6 items-center justify-center rounded text-xs leading-none text-muted hover:bg-elevated';

/** Panel used to group a block of related content. */
export const card = 'rounded-lg border border-subtle bg-surface p-5';
