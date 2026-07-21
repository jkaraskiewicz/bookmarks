<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * A modal dialog: a backdrop, a panel, and the roles that tell a screen reader
	 * what it is looking at.
	 *
	 * `dismissable` says whether the backdrop and Escape close it, and the answer
	 * depends on what the dialog holds. A form can lose typed work to a stray click
	 * beside it, so it says no and insists on a deliberate Cancel; a panel of settings
	 * that apply as you pick them has nothing to lose, so it says yes.
	 */
	let {
		title,
		dismissable = false,
		onclose,
		children
	}: {
		/** Names the dialog for assistive technology, and heads the panel. */
		title: string;
		/** Whether the backdrop and the Escape key close it. */
		dismissable?: boolean;
		onclose: () => void;
		children: Snippet;
	} = $props();

	const titleId = $props.id();

	function dismiss() {
		if (dismissable) onclose();
	}
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && dismiss()} />

<!--
	The backdrop is scenery: the dialog role belongs to the panel, so a screen reader
	is told about the thing with the content in it rather than the sheet behind it.
-->
<div
	class="fixed inset-0 z-10 flex items-center justify-center bg-overlay p-4"
	role="presentation"
	onclick={(event) => event.target === event.currentTarget && dismiss()}
>
	<div
		class="w-full max-w-md space-y-3 rounded-lg border border-line bg-canvas p-5 text-content"
		role="dialog"
		aria-modal="true"
		aria-labelledby={titleId}
	>
		<h2 id={titleId} class="text-base font-semibold">{title}</h2>
		{@render children()}
	</div>
</div>
