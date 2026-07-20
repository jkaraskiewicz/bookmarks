<script lang="ts">
	import { theme } from './theme.svelte';
	import { PREFERENCE_ORDER, preferenceIcon, preferenceLabel, toPreference } from './index';

	/**
	 * Picks a theme from a list. A native `<select>` rather than a custom menu: it is
	 * keyboard- and screen-reader-correct for free, and it scales — cycling through a
	 * button meant every new theme made reaching any other theme slower.
	 *
	 * Options come from the registry, so adding a theme adds it here.
	 */
	const current = $derived(theme.preference);
	const resolved = $derived(theme.current);
</script>

<label class="shrink-0">
	<span class="sr-only">Theme</span>
	<!--
		`@tailwindcss/forms` already draws the dropdown arrow as a background image and
		reserves room for it on the right. Hence `pr-7` rather than a plain `px-2`, and
		no arrow of our own — adding one showed two.
	-->
	<select
		value={current}
		onchange={(event) => theme.set(toPreference(event.currentTarget.value))}
		title={current === 'system' ? `Theme: System (currently ${resolved})` : 'Theme'}
		class="cursor-pointer rounded-md border border-line bg-transparent py-1.5 pr-9 pl-2.5 text-sm text-muted hover:bg-elevated hover:text-content focus:ring-2 focus:ring-focus focus:outline-none"
	>
		{#each PREFERENCE_ORDER as preference (preference)}
			<!-- One line: a select collapses whitespace inconsistently across browsers. -->
			<option value={preference} class="bg-surface text-content"
				>{preferenceIcon(preference)} {preferenceLabel(preference)}</option
			>
		{/each}
	</select>
</label>
