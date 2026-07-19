<script lang="ts">
	import { hostname } from '$lib/url';

	interface Existing {
		url: string;
		title: string;
		collection?: string;
	}

	let {
		kind,
		message,
		existing
	}: {
		kind: 'exact' | 'similar';
		message: string;
		existing: Existing;
	} = $props();

	// Smaller than the shared secondary button, to sit inside the notice.
	const actionClass = 'rounded border border-line px-2 py-1 text-xs text-content hover:bg-elevated';
</script>

<!--
	Rendered inside the add form, so these are plain submit buttons: `formaction`
	picks the server action and the hidden inputs carry the extra fields. No form
	mutation, so the form's own action never gets left pointing somewhere else.
-->
<div class="mt-2 rounded-md border border-warning-line bg-warning-surface px-3 py-2 text-sm">
	<p class="text-warning">{message}</p>

	<p class="mt-1 truncate text-secondary">
		<a href={existing.url} target="_blank" rel="noreferrer" class="hover:underline"
			>{existing.title}</a
		>
		<span class="text-faint">· {hostname(existing.url)}</span>
		{#if existing.collection}<span class="text-faint">· in {existing.collection}</span>{/if}
	</p>

	<input type="hidden" name="existingUrl" value={existing.url} />

	<div class="mt-2 flex gap-2">
		<button type="submit" formaction="?/merge" class={actionClass}>Add my tags & notes to it</button
		>
		{#if kind === 'similar'}
			<!-- Only a *probable* duplicate may be forced through; a certain one never is. -->
			<button type="submit" formaction="?/add" name="force" value="true" class={actionClass}
				>Add as a separate bookmark</button
			>
		{/if}
	</div>
</div>
