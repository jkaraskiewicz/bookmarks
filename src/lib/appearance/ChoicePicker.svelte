<script lang="ts" generics="T extends string">
	import type { Choice } from './choice';
	import { field } from '$lib/components/ui';

	/**
	 * One labelled dropdown over a list of choices.
	 *
	 * The appearance settings are all the same shape — pick one of a fixed list, and
	 * it applies immediately — so they share a control rather than repeating a
	 * `<label>`, `<select>` and `{#each}` three times over.
	 */
	let {
		label,
		choices,
		value,
		onpick,
		describe
	}: {
		label: string;
		choices: readonly Choice[];
		value: T;
		onpick: (id: T) => void;
		/** Optional per-option styling, e.g. showing each font in its own face. */
		describe?: (choice: Choice) => string | undefined;
	} = $props();
</script>

<label class="block text-sm">
	<span class="text-muted">{label}</span>
	<select {value} onchange={(event) => onpick(event.currentTarget.value as T)} class="mt-1 {field}">
		{#each choices as choice (choice.id)}
			<option value={choice.id} style={describe?.(choice)}>{choice.label}</option>
		{/each}
	</select>
</label>
