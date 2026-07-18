<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { fieldClass, primaryButton, secondaryButton } from '$lib/components/ui';
	import ImportOptionFields from '$lib/components/ImportOptionFields.svelte';
	import ImportCard from '$lib/components/ImportCard.svelte';
	import ImportSummary from '$lib/components/ImportSummary.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const errorMessage = $derived(form && 'message' in form ? form.message : null);
	const summary = $derived(form && 'summary' in form ? form.summary : null);

	// Only named folders are worth offering; the unfiled root is not a choice.
	const folderOptions = $derived(data.folders.filter((folder) => folder.path));
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
			<ImportSummary {summary} />
		{/if}
		{#if errorMessage}
			<p
				class="rounded-md border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-300"
			>
				{errorMessage}
			</p>
		{/if}

		<ImportCard title="From Chrome directly">
			{#snippet description()}
				Reads Chrome's bookmarks straight from your profile — no export needed. To grab every open
				tab first, press <kbd class="rounded bg-neutral-800 px-1.5 py-0.5 text-xs">⇧⌘D</kbd> in Chrome
				("Bookmark all tabs…"), save them to a new folder, then import just that folder below.
			{/snippet}

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
							placeholder="e.g. Bookmarks bar/Open tabs"
							class="mt-1 {fieldClass}"
						/>
					</label>
					<datalist id="chrome-folders">
						{#each folderOptions as folder (folder.path)}
							<option value={folder.path}>{folder.count} bookmarks</option>
						{/each}
					</datalist>

					<ImportOptionFields />
					<button class={primaryButton} type="submit">Import from Chrome</button>
				</form>
			{:else}
				<p class="mt-3 text-sm text-neutral-500">
					No Chrome profile found on this machine. Use the file upload below instead.
				</p>
			{/if}
		</ImportCard>

		<ImportCard title="From an exported bookmarks file">
			{#snippet description()}
				In Chrome: <code class="text-neutral-300">chrome://bookmarks</code> → ⋮ → Export bookmarks. Firefox,
				Safari and Edge export the same format.
			{/snippet}

			<form method="POST" action="?/file" enctype="multipart/form-data" class="mt-4 space-y-3">
				<input
					type="file"
					name="file"
					accept=".html,.htm,text/html"
					class="block w-full text-sm text-neutral-300 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-sm file:text-neutral-200 hover:file:bg-neutral-700"
				/>
				<ImportOptionFields />
				<button class={primaryButton} type="submit">Import file</button>
			</form>
		</ImportCard>

		<ImportCard title="Paste URLs">
			{#snippet description()}
				One URL per line, optionally followed by a title. Handy with a "copy all tab URLs"
				extension.
			{/snippet}

			<form method="POST" action="?/paste" class="mt-4 space-y-3">
				<textarea
					name="urls"
					rows="6"
					placeholder={'https://svelte.dev  Svelte\nhttps://news.ycombinator.com'}
					class="{fieldClass} font-mono text-xs"></textarea>
				<ImportOptionFields />
				<button class={primaryButton} type="submit">Import URLs</button>
			</form>
		</ImportCard>

		<ImportCard title="Export">
			{#snippet description()}
				Download everything as a bookmarks HTML file you can import into any browser.
			{/snippet}

			<a href="/export" download class="mt-4 inline-block {secondaryButton}"
				>Download bookmarks.html</a
			>
		</ImportCard>
	</div>
</div>
