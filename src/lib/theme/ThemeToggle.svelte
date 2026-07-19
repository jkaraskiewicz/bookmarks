<script lang="ts">
	import { theme } from './theme.svelte';
	import { nextPreference, preferenceIcon, preferenceLabel } from './index';

	/** Cycles dark → light → system. The label says which, so "system" is not a mystery. */
	const label = $derived(preferenceLabel(theme.preference));
	const icon = $derived(preferenceIcon(theme.preference));
	const resolved = $derived(theme.current);
</script>

<button
	type="button"
	onclick={() => theme.set(nextPreference(theme.preference))}
	class="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-sm text-muted hover:bg-elevated hover:text-content"
	title="Theme: {label}{theme.preference === 'system'
		? ` (currently ${resolved})`
		: ''} — click to change"
	aria-label="Theme: {label}. Click to change."
>
	<span aria-hidden="true">{icon}</span>
	<span class="hidden sm:inline">{label}</span>
</button>
