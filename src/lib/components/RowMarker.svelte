<script lang="ts">
	/**
	 * The square at the start of a row: normally the site's icon, a checkbox on hover
	 * or while selecting.
	 *
	 * The two share one slot rather than taking a column each. Rows are read far more
	 * often than they are selected, so a checkbox on every row is clutter most of the
	 * time — but it has to stay one movement away, and reachable by keyboard.
	 */
	let {
		favicon,
		pending,
		selected,
		selecting,
		label,
		ontoggle
	}: {
		favicon: string | undefined;
		/** Metadata is being fetched, so there may not be an icon yet. */
		pending: boolean;
		selected: boolean;
		/** True once anything on the page is selected, which pins every checkbox open. */
		selecting: boolean;
		/** What the checkbox selects, for screen readers. */
		label: string;
		ontoggle: () => void;
	} = $props();

	const pinned = $derived(selected || selecting);
</script>

<div class="relative size-4 shrink-0">
	<span class="block transition-opacity {pinned ? 'opacity-0' : 'group-hover:opacity-0'}">
		{#if pending}
			<span
				class="block size-4 animate-pulse rounded-sm bg-accent-hover/50"
				title="Fetching metadata…"
			></span>
		{:else if favicon}
			<img
				src={favicon}
				alt=""
				class="size-4 rounded-sm"
				onerror={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
			/>
		{:else}
			<span class="block size-4 rounded-sm bg-muted-surface"></span>
		{/if}
	</span>

	<!-- `focus-visible` keeps it reachable by keyboard even while invisible. -->
	<input
		type="checkbox"
		checked={selected}
		onchange={ontoggle}
		class="absolute inset-0 size-4 cursor-pointer rounded border-line text-accent transition-opacity focus:ring-focus
			{pinned ? '' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'}"
		aria-label="Select {label}"
	/>
</div>
