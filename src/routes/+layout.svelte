<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { theme } from '$lib/theme/theme.svelte';

	let { children } = $props();

	// The inline script in app.html sets the first frame; this keeps it in step with
	// the stored choice and with the system changing under us.
	$effect(() => theme.start());
	$effect(() => theme.apply());
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
