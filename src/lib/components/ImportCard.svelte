<script lang="ts">
	import type { Snippet } from 'svelte';
	import { card } from './ui';

	/**
	 * One import source: a titled card explaining the route in, wrapping whatever
	 * controls that route needs.
	 */
	let {
		title,
		description,
		children
	}: {
		title: string;
		description: Snippet;
		children: Snippet;
	} = $props();
</script>

<section class={card}>
	<h2 class="font-medium">{title}</h2>
	<p class="mt-1 text-sm text-muted">{@render description()}</p>
	{@render children()}
</section>
