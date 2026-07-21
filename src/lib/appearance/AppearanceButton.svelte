<script lang="ts">
	import AppearanceDialog from './AppearanceDialog.svelte';

	/** Opens the appearance settings. Sits in every route's header. */
	let open = $state(false);
</script>

<button
	type="button"
	onclick={() => (open = true)}
	class="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-sm text-muted hover:bg-elevated hover:text-content"
	title="Appearance — theme, font and text size"
	aria-haspopup="dialog"
>
	<span aria-hidden="true">🎨</span>
	<span class="hidden sm:inline">Appearance</span>
</button>

{#if open}
	<AppearanceDialog onclose={() => (open = false)} />
{/if}
