<script lang="ts">
	import type { ImportSummary } from '$lib/import/types';

	/** Result of an import: what landed, what was skipped, what needs a look. */
	let { summary }: { summary: ImportSummary } = $props();

	const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
</script>

<p class="rounded-md border border-success-line bg-success-surface px-4 py-3 text-sm text-success">
	Imported <strong>{summary.added}</strong>
	{summary.added === 1 ? 'bookmark' : 'bookmarks'}.
	{#if summary.skipped}<span class="text-success/70">
			{summary.skipped} skipped (already bookmarked).</span
		>{/if}
	<a href="/" class="underline">View them →</a>
</p>

{#if summary.possibleDuplicates.length}
	<details class="rounded-md border border-subtle bg-surface px-4 py-3 text-sm text-secondary">
		<summary class="cursor-pointer">
			{plural(summary.possibleDuplicates.length, 'imported bookmark')} may duplicate something you already
			had
		</summary>
		<p class="mt-2 text-xs text-faint">
			These differ only by <code>www</code>, <code>http</code>/<code>https</code> or a trailing slash,
			so they were imported rather than dropped. Delete either side if it's redundant.
		</p>
		<ul class="mt-2 space-y-2">
			{#each summary.possibleDuplicates as pair (pair.url)}
				<li class="min-w-0">
					<span class="block truncate text-secondary">＋ {pair.url}</span>
					<span class="block truncate text-faint">↪ existing: {pair.existing}</span>
				</li>
			{/each}
		</ul>
	</details>
{/if}
