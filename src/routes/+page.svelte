<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { Bookmark } from '$lib/types';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let search = $state('');
	let activeTags = $state<string[]>([]);
	let activeCollection = $state('');
	let editing = $state<Bookmark | null>(null);
	let addUrl = $state('');
	let showAdvanced = $state(false);

	const allTags = $derived(
		[...new Set(data.bookmarks.flatMap((b) => b.tags))].sort((a, b) => a.localeCompare(b))
	);

	// Collections are `/`-separated paths (e.g. "Dev/Frameworks"). Build a tree from them.
	interface TreeNode {
		name: string; // leaf segment, e.g. "Frameworks"
		path: string; // full path, e.g. "Dev/Frameworks"
		count: number; // bookmarks at or below this node
		children: TreeNode[];
	}

	function buildTree(bookmarks: Bookmark[]): TreeNode[] {
		const roots: TreeNode[] = [];
		const index = new Map<string, TreeNode>();
		for (const b of bookmarks) {
			if (!b.collection) continue;
			const segments = b.collection
				.split('/')
				.map((s) => s.trim())
				.filter(Boolean);
			let siblings = roots;
			let path = '';
			for (const name of segments) {
				path = path ? `${path}/${name}` : name;
				let node = index.get(path);
				if (!node) {
					node = { name, path, count: 0, children: [] };
					index.set(path, node);
					siblings.push(node);
				}
				node.count++;
				siblings = node.children;
			}
		}
		const sortRec = (nodes: TreeNode[]) => {
			nodes.sort((a, b) => a.name.localeCompare(b.name));
			nodes.forEach((n) => sortRec(n.children));
		};
		sortRec(roots);
		return roots;
	}

	function flatten(nodes: TreeNode[]): string[] {
		return nodes.flatMap((n) => [n.path, ...flatten(n.children)]);
	}

	const collectionTree = $derived(buildTree(data.bookmarks));
	const collectionPaths = $derived(flatten(collectionTree).sort());

	// A selected collection matches itself and any nested descendant.
	function inCollection(collection: string | undefined, selected: string): boolean {
		if (!selected) return true;
		return collection === selected || !!collection?.startsWith(selected + '/');
	}

	const filtered = $derived(
		data.bookmarks.filter((b) => {
			const q = search.trim().toLowerCase();
			const matchesSearch =
				!q || [b.title, b.url, b.notes, b.description].some((f) => f?.toLowerCase().includes(q));
			const matchesTags = activeTags.every((t) => b.tags.includes(t));
			return matchesSearch && matchesTags && inCollection(b.collection, activeCollection);
		})
	);

	// URLs the server is currently fetching metadata for.
	const pendingSet = $derived(new Set(data.pending));

	// While anything is being enriched, re-run the load to pick up results, then stop.
	$effect(() => {
		if (data.pending.length === 0) return;
		const id = setTimeout(() => invalidateAll(), 1000);
		return () => clearTimeout(id);
	});

	function toggleTag(tag: string) {
		activeTags = activeTags.includes(tag)
			? activeTags.filter((t) => t !== tag)
			: [...activeTags, tag];
	}

	function hostname(url: string): string {
		try {
			return new URL(url).hostname.replace(/^www\./, '');
		} catch {
			return url;
		}
	}

	// Reset + collapse the add form on success; metadata fills in via the poll above.
	const enhanceAdd: SubmitFunction = () => {
		return async ({ update, result }) => {
			await update({ reset: result.type === 'success' });
			if (result.type === 'success') {
				addUrl = '';
				showAdvanced = false;
			}
		};
	};

	const fieldClass =
		'w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-blue-500';
</script>

<svelte:head><title>Bookmarks</title></svelte:head>

<!-- Recursive renderer for a nested collection tree. -->
{#snippet collectionNode(node: TreeNode, depth: number)}
	<button
		style="padding-left: {depth * 14 + 8}px"
		class="flex w-full items-center gap-1.5 rounded py-0.5 pr-2 text-left hover:bg-neutral-800 {activeCollection ===
		node.path
			? 'text-blue-400'
			: 'text-neutral-300'}"
		onclick={() => (activeCollection = node.path)}
	>
		{#if depth > 0}<span class="text-neutral-600">└</span>{/if}
		<span class="truncate">{node.name}</span>
		<span class="ml-auto text-xs text-neutral-600">{node.count}</span>
	</button>
	{#each node.children as child (child.path)}
		{@render collectionNode(child, depth + 1)}
	{/each}
{/snippet}

<!-- Autocomplete source for collection inputs. -->
<datalist id="collection-list">
	{#each collectionPaths as path (path)}<option value={path}></option>{/each}
</datalist>

<div class="min-h-screen bg-neutral-900 text-neutral-100">
	<header class="border-b border-neutral-800 bg-neutral-950/60 px-6 py-4">
		<form method="POST" action="?/add" use:enhance={enhanceAdd} class="mx-auto max-w-5xl">
			<div class="flex items-center gap-3">
				<h1 class="text-lg font-semibold tracking-tight whitespace-nowrap">🔖 Bookmarks</h1>
				<input
					name="url"
					bind:value={addUrl}
					type="text"
					placeholder="Paste a URL and press Add…"
					class="flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-blue-500"
				/>
				<button
					type="button"
					onclick={() => (showAdvanced = !showAdvanced)}
					aria-expanded={showAdvanced}
					class="rounded-md border border-neutral-700 px-2.5 py-1.5 text-sm text-neutral-400 hover:bg-neutral-800"
					title="More fields">{showAdvanced ? 'Less −' : 'More +'}</button
				>
				<button
					class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
					type="submit">Add</button
				>
			</div>

			{#if showAdvanced}
				<div class="mt-2 grid grid-cols-2 gap-2">
					<input name="title" placeholder="Title (optional)" class="col-span-2 {fieldClass}" />
					<input name="tags" placeholder="Tags (comma separated)" class={fieldClass} />
					<input
						name="collection"
						placeholder="Collection (e.g. Dev/Frameworks)"
						list="collection-list"
						class={fieldClass}
					/>
					<textarea name="notes" rows="2" placeholder="Notes" class="col-span-2 {fieldClass}"
					></textarea>
				</div>
			{/if}
		</form>
		{#if form && 'message' in form && form.message}
			<p class="mx-auto mt-2 max-w-5xl text-sm text-amber-400">{form.message}</p>
		{/if}
	</header>

	<div class="mx-auto flex max-w-5xl gap-6 px-6 py-6">
		<!-- Sidebar: search + filters -->
		<aside class="w-56 shrink-0 space-y-5">
			<input
				bind:value={search}
				type="search"
				placeholder="Search…"
				class="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-blue-500"
			/>

			{#if collectionTree.length}
				<div>
					<h2 class="mb-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
						Collections
					</h2>
					<div class="space-y-0.5 text-sm">
						<button
							class="block w-full rounded px-2 py-0.5 text-left hover:bg-neutral-800 {activeCollection ===
							''
								? 'text-blue-400'
								: 'text-neutral-300'}"
							onclick={() => (activeCollection = '')}>All</button
						>
						{#each collectionTree as node (node.path)}
							{@render collectionNode(node, 0)}
						{/each}
					</div>
				</div>
			{/if}

			{#if allTags.length}
				<div>
					<h2 class="mb-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
						Tags
					</h2>
					<div class="flex flex-wrap gap-1.5">
						{#each allTags as tag (tag)}
							<button
								onclick={() => toggleTag(tag)}
								class="rounded-full px-2 py-0.5 text-xs {activeTags.includes(tag)
									? 'bg-blue-600 text-white'
									: 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}">#{tag}</button
							>
						{/each}
					</div>
				</div>
			{/if}
		</aside>

		<!-- Main: compact list -->
		<main class="min-w-0 flex-1">
			<p class="mb-3 text-xs text-neutral-500">
				{filtered.length} of {data.bookmarks.length} bookmark{data.bookmarks.length === 1
					? ''
					: 's'}
			</p>

			{#if data.bookmarks.length === 0}
				<p class="text-sm text-neutral-500">
					No bookmarks yet. Paste a URL above to add your first one.
				</p>
			{:else}
				<ul class="divide-y divide-neutral-800">
					{#each filtered as b (b.url)}
						{@const isPending = pendingSet.has(b.url)}
						<li class="group flex items-center gap-3 py-2">
							{#if isPending}
								<span
									class="size-4 shrink-0 animate-pulse rounded-sm bg-blue-500/50"
									title="Fetching metadata…"
								></span>
							{:else if b.favicon}
								<img
									src={b.favicon}
									alt=""
									class="size-4 shrink-0 rounded-sm"
									onerror={(e) =>
										((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
								/>
							{:else}
								<span class="size-4 shrink-0 rounded-sm bg-neutral-700"></span>
							{/if}

							<div class="min-w-0 flex-1">
								<a
									href={b.url}
									target="_blank"
									rel="noreferrer"
									class="truncate font-medium text-neutral-100 hover:text-blue-400"
									title={b.description || b.url}>{b.title}</a
								>
								<span class="ml-2 text-xs text-neutral-500">{hostname(b.url)}</span>
								{#if b.collection}
									<span class="ml-2 text-xs text-neutral-600">/ {b.collection}</span>
								{/if}
								{#if isPending}
									<span class="ml-2 animate-pulse text-xs text-blue-400">fetching…</span>
								{/if}
								{#if b.notes}
									<p class="truncate text-xs text-neutral-500">{b.notes}</p>
								{:else if b.description}
									<p class="truncate text-xs text-neutral-600 italic">{b.description}</p>
								{/if}
							</div>

							<div class="flex shrink-0 flex-wrap gap-1">
								{#each b.tags as tag (tag)}
									<button
										onclick={() => toggleTag(tag)}
										class="rounded-full bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-700"
										>#{tag}</button
									>
								{/each}
							</div>

							<div
								class="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100"
							>
								<button
									onclick={() => (editing = b)}
									class="inline-flex h-6 items-center justify-center rounded px-1.5 text-xs leading-none text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
									title="Edit">Edit</button
								>
								<form method="POST" action="?/refresh" use:enhance class="contents">
									<input type="hidden" name="url" value={b.url} />
									<button
										class="inline-flex h-6 w-6 items-center justify-center rounded text-xs leading-none text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
										title="Re-fetch metadata">↻</button
									>
								</form>
								<form method="POST" action="?/delete" use:enhance class="contents">
									<input type="hidden" name="url" value={b.url} />
									<button
										class="inline-flex h-6 w-6 items-center justify-center rounded text-xs leading-none text-neutral-400 hover:bg-neutral-800 hover:text-red-400"
										title="Delete">✕</button
									>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</main>
	</div>
</div>

<!-- Edit modal -->
{#if editing}
	<div
		class="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4"
		onclick={(e) => e.target === e.currentTarget && (editing = null)}
		role="presentation"
	>
		<form
			method="POST"
			action="?/update"
			use:enhance={() =>
				async ({ update }) => {
					await update();
					editing = null;
				}}
			class="w-full max-w-md space-y-3 rounded-lg border border-neutral-700 bg-neutral-900 p-5 text-neutral-100"
		>
			<h2 class="text-base font-semibold">Edit bookmark</h2>
			<input type="hidden" name="originalUrl" value={editing.url} />

			<label class="block text-sm">
				<span class="text-neutral-400">Title</span>
				<input name="title" value={editing.title} class="mt-1 {fieldClass}" />
			</label>
			<label class="block text-sm">
				<span class="text-neutral-400">URL</span>
				<input name="url" value={editing.url} class="mt-1 {fieldClass}" />
			</label>
			<label class="block text-sm">
				<span class="text-neutral-400">Tags (comma separated)</span>
				<input name="tags" value={editing.tags.join(', ')} class="mt-1 {fieldClass}" />
			</label>
			<label class="block text-sm">
				<span class="text-neutral-400">Collection</span>
				<input
					name="collection"
					value={editing.collection ?? ''}
					list="collection-list"
					class="mt-1 {fieldClass}"
				/>
			</label>
			<label class="block text-sm">
				<span class="text-neutral-400">Notes</span>
				<textarea name="notes" rows="3" class="mt-1 {fieldClass}">{editing.notes ?? ''}</textarea>
			</label>

			{#if editing.description}
				<div class="text-sm">
					<span class="text-neutral-400">Description (auto-fetched)</span>
					<p
						class="mt-1 rounded-md border border-neutral-800 bg-neutral-800/40 px-3 py-1.5 text-sm text-neutral-300"
					>
						{editing.description}
					</p>
				</div>
			{/if}

			<div class="flex justify-end gap-2 pt-1">
				<button
					type="button"
					onclick={() => (editing = null)}
					class="rounded-md px-3 py-1.5 text-sm text-neutral-400 hover:bg-neutral-800"
					>Cancel</button
				>
				<button
					class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
					>Save</button
				>
			</div>
		</form>
	</div>
{/if}
