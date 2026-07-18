<script lang="ts">
	import { page } from '$app/state';

	const views = [
		{ href: '/', label: 'List' },
		{ href: '/graph', label: 'Graph' }
	];
</script>

<nav class="inline-flex shrink-0 rounded-md border border-neutral-700 p-0.5 text-sm">
	{#each views as view (view.href)}
		<a
			href={view.href}
			class="rounded px-3 py-1 {page.url.pathname === view.href
				? 'bg-neutral-700 text-white'
				: 'text-neutral-400 hover:text-neutral-100'}">{view.label}</a
		>
	{/each}
</nav>
