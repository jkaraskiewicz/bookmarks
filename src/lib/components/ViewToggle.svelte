<script lang="ts">
	import { page } from '$app/state';

	const views = [
		{ href: '/', label: 'List' },
		{ href: '/graph', label: 'Graph' }
	];
</script>

<nav class="inline-flex shrink-0 rounded-md border border-line p-0.5 text-sm">
	{#each views as view (view.href)}
		<a
			href={view.href}
			class="rounded px-3 py-1 {page.url.pathname === view.href
				? 'bg-muted-surface text-content'
				: 'text-muted hover:text-content'}">{view.label}</a
		>
	{/each}
</nav>
