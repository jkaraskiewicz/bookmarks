<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';

	/**
	 * A form that posts one or more bookmark URLs to an action.
	 *
	 * Every bookmark operation identifies its subject the same way — repeated `url`
	 * fields — so the wrapper carries that convention and each caller supplies only
	 * the action and its button. `display: contents` keeps the form out of the
	 * layout, so buttons sit in their parent's flow as if the form were not there.
	 */
	let {
		action,
		url,
		onsubmitted,
		children
	}: {
		/** The form action to post to, e.g. `?/delete`. */
		action: string;
		/** The bookmark(s) the action applies to. */
		url: string | string[];
		/** Runs after the action has completed and the page data has been updated. */
		onsubmitted?: () => void;
		children: Snippet;
	} = $props();

	const urls = $derived(typeof url === 'string' ? [url] : url);

	const submit: SubmitFunction =
		() =>
		async ({ update }) => {
			await update();
			onsubmitted?.();
		};
</script>

<form method="POST" {action} use:enhance={submit} class="contents">
	{#each urls as value (value)}<input type="hidden" name="url" {value} />{/each}
	{@render children()}
</form>
