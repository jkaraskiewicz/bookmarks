<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';

	let { data }: NodeProps = $props();
	const bookmark = $derived(data as { label: string; url: string; favicon?: string });
</script>

<!--
	No `nodrag` here, so a bookmark can be pulled out of a crowded cluster. Svelte Flow
	still treats a click without movement as a click, so the link keeps working.
-->
<a
	href={bookmark.url}
	target="_blank"
	rel="noreferrer"
	title={bookmark.url}
	class="flex max-w-[190px] items-center gap-1.5 rounded-md border border-line bg-elevated px-2 py-1 text-[11px] text-content no-underline shadow hover:border-focus hover:text-content"
>
	{#if bookmark.favicon}
		<img
			src={bookmark.favicon}
			alt=""
			class="size-3.5 shrink-0 rounded-sm"
			onerror={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
		/>
	{:else}
		<span class="size-3.5 shrink-0 rounded-sm bg-muted-surface"></span>
	{/if}
	<span class="truncate">{bookmark.label}</span>
</a>

<Handle type="target" position={Position.Top} style="opacity:0" isConnectable={false} />
<Handle type="source" position={Position.Bottom} style="opacity:0" isConnectable={false} />
