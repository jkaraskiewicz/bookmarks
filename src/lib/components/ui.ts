/** Shared Tailwind classes for dark-theme form controls. */
export const inputBase =
	'rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-blue-500';

/** Full-width variant, used by most fields. Use `inputBase` when width is controlled by flex. */
export const fieldClass = `w-full ${inputBase}`;
