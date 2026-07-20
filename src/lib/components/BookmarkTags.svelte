<script lang="ts">
	import { splitTagsForRow } from '$lib/tags';

	/**
	 * A bookmark's tags, on exactly one line.
	 *
	 * Wrapping used to grow the row, so a heavily tagged bookmark stood taller than
	 * its neighbours and the list lost its rhythm. Instead a fixed number of tags is
	 * shown and the rest collapse into a `+N` chip that expands this row on click.
	 * Individual tags truncate rather than wrap, so the height holds however long a
	 * tag is.
	 */
	let {
		tags,
		ontoggle
	}: {
		tags: string[];
		ontoggle: (tag: string) => void;
	} = $props();

	let expanded = $state(false);

	const split = $derived(splitTagsForRow(tags));
	const shown = $derived(expanded ? tags : split.visible);
	const hiddenCount = $derived(split.hidden.length);

	const chip = 'rounded-full bg-elevated px-1.5 py-0.5 text-xs text-muted hover:bg-muted-surface';
</script>

{#if tags.length > 0}
	<div
		class="flex max-w-1/2 shrink items-center justify-end gap-1 {expanded
			? 'flex-wrap'
			: 'flex-nowrap'}"
	>
		{#each shown as tag (tag)}
			<button onclick={() => ontoggle(tag)} class="{chip} min-w-0 truncate" title="#{tag}"
				>#{tag}</button
			>
		{/each}

		{#if hiddenCount > 0}
			<button
				onclick={() => (expanded = !expanded)}
				class="{chip} shrink-0"
				title={expanded ? 'Show fewer tags' : split.hidden.map((tag) => `#${tag}`).join(' ')}
				aria-expanded={expanded}
				aria-label={expanded
					? 'Show fewer tags'
					: `Show ${hiddenCount} more tag${hiddenCount === 1 ? '' : 's'}`}
				>{expanded ? '−' : `+${hiddenCount}`}</button
			>
		{/if}
	</div>
{/if}
