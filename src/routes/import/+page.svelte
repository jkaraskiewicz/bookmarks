<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { fieldClass } from '$lib/components/ui';
	import ImportOptionFields from '$lib/components/ImportOptionFields.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const errorMessage = $derived(form && 'message' in form ? form.message : null);
	const summary = $derived(form && 'summary' in form ? form.summary : null);

	const buttonClass =
		'rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500';
	const cardClass = 'rounded-lg border border-neutral-800 bg-neutral-950/40 p-5';

	// Folders that look like a "Bookmark all tabs" drop, surfaced as quick picks.
	const folderOptions = $derived(data.folders.filter((f) => f.path));
</script>

<svelte:head><title>Bookmarks · Import</title></svelte:head>

<div class="min-h-screen bg-neutral-900 text-neutral-100">
	<header class="border-b border-neutral-800 bg-neutral-950/60 px-6 py-4">
		<div class="mx-auto flex max-w-3xl items-center gap-4">
			<h1 class="text-lg font-semibold tracking-tight">🔖 Import bookmarks</h1>
			<div class="flex-1"></div>
			<a href="/" class="text-sm text-neutral-400 hover:text-neutral-100">← Back to list</a>
		</div>
	</header>

	<div class="mx-auto max-w-3xl space-y-6 px-6 py-6">
		{#if summary}
			<p
				class="rounded-md border border-green-800 bg-green-950/40 px-4 py-3 text-sm text-green-300"
			>
				Imported <strong>{summary.added}</strong>
				{summary.added === 1 ? 'bookmark' : 'bookmarks'}.
				{#if summary.skipped}<span class="text-green-400/70">
						{summary.skipped} skipped (already bookmarked).</span
					>{/if}
				<a href="/" class="underline">View them →</a>
			</p>

			{#if summary.possibleDuplicates.length}
				<details
					class="rounded-md border border-neutral-800 bg-neutral-950/40 px-4 py-3 text-sm text-neutral-300"
				>
					<summary class="cursor-pointer">
						{summary.possibleDuplicates.length} imported bookmark{summary.possibleDuplicates
							.length === 1
							? ''
							: 's'} may duplicate something you already had
					</summary>
					<p class="mt-2 text-xs text-neutral-500">
						These differ only by <code>www</code>, <code>http</code>/<code>https</code> or a trailing
						slash, so they were imported rather than dropped. Delete either side if it's redundant.
					</p>
					<ul class="mt-2 space-y-2">
						{#each summary.possibleDuplicates as pair (pair.url)}
							<li class="min-w-0">
								<span class="block truncate text-neutral-300">＋ {pair.url}</span>
								<span class="block truncate text-neutral-500">↪ existing: {pair.existing}</span>
							</li>
						{/each}
					</ul>
				</details>
			{/if}
		{/if}
		{#if errorMessage}
			<p
				class="rounded-md border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-300"
			>
				{errorMessage}
			</p>
		{/if}

		<!-- 1. Live Chrome profile -->
		<section class={cardClass}>
			<h2 class="font-medium">From Chrome directly</h2>
			<p class="mt-1 text-sm text-neutral-400">
				Reads Chrome's bookmarks straight from your profile — no export needed. To grab every open
				tab first, press <kbd class="rounded bg-neutral-800 px-1.5 py-0.5 text-xs">⇧⌘D</kbd> in Chrome
				("Bookmark all tabs…"), save them to a new folder, then import just that folder below.
			</p>

			{#if data.profiles.length}
				<form method="POST" action="?/profile" class="mt-4 space-y-3">
					<label class="block text-sm">
						<span class="text-neutral-400">Profile</span>
						<select name="profile" class="mt-1 {fieldClass}">
							{#each data.profiles as profile (profile.dir)}
								<option value={profile.dir}>{profile.dir} — {profile.count} bookmarks</option>
							{/each}
						</select>
					</label>

					<label class="block text-sm">
						<span class="text-neutral-400">Only this folder (optional)</span>
						<input
							name="onlyCollection"
							list="chrome-folders"
							placeholder="e.g. Bookmarks bar/Open tabs 2026-07-19"
							class="mt-1 {fieldClass}"
						/>
					</label>
					<datalist id="chrome-folders">
						{#each folderOptions as folder (folder.path)}
							<option value={folder.path}>{folder.count} bookmarks</option>
						{/each}
					</datalist>

					<ImportOptionFields />
					<button class={buttonClass} type="submit">Import from Chrome</button>
				</form>
			{:else}
				<p class="mt-3 text-sm text-neutral-500">
					No Chrome profile found on this machine. Use the file upload below instead.
				</p>
			{/if}
		</section>

		<!-- 2. Exported HTML file -->
		<section class={cardClass}>
			<h2 class="font-medium">From an exported bookmarks file</h2>
			<p class="mt-1 text-sm text-neutral-400">
				In Chrome: <code class="text-neutral-300">chrome://bookmarks</code> → ⋮ → Export bookmarks. Firefox,
				Safari and Edge export the same format.
			</p>

			<form method="POST" action="?/file" enctype="multipart/form-data" class="mt-4 space-y-3">
				<input
					type="file"
					name="file"
					accept=".html,.htm,text/html"
					class="block w-full text-sm text-neutral-300 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-sm file:text-neutral-200 hover:file:bg-neutral-700"
				/>
				<ImportOptionFields />
				<button class={buttonClass} type="submit">Import file</button>
			</form>
		</section>

		<!-- 3. Pasted URLs -->
		<section class={cardClass}>
			<h2 class="font-medium">Paste URLs</h2>
			<p class="mt-1 text-sm text-neutral-400">
				One URL per line, optionally followed by a title. Handy with a "copy all tab URLs"
				extension.
			</p>

			<form method="POST" action="?/paste" class="mt-4 space-y-3">
				<textarea
					name="urls"
					rows="6"
					placeholder={'https://svelte.dev  Svelte\nhttps://news.ycombinator.com'}
					class="{fieldClass} font-mono text-xs"></textarea>
				<ImportOptionFields />
				<button class={buttonClass} type="submit">Import URLs</button>
			</form>
		</section>

		<!-- Export -->
		<section class={cardClass}>
			<h2 class="font-medium">Export</h2>
			<p class="mt-1 text-sm text-neutral-400">
				Download everything as a bookmarks HTML file you can import into any browser.
			</p>
			<a
				href="/export"
				download
				class="mt-4 inline-block rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
				>Download bookmarks.html</a
			>
		</section>
	</div>
</div>
