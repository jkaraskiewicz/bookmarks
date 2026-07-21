<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { theme } from '$lib/theme/theme.svelte';
	import { appearance } from '$lib/appearance/appearance.svelte';

	let { children } = $props();

	// The inline script in app.html sets the first frame; these keep it in step with
	// the stored choices and with the system changing under us.
	$effect(() => theme.start());
	$effect(() => theme.apply());
	$effect(() => appearance.start());
	$effect(() => appearance.apply());
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
