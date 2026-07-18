<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';

	let { data }: NodeProps = $props();
	const d = $derived(data as { label: string; url: string; favicon?: string; degree: number });
</script>

<a
	href={d.url}
	target="_blank"
	rel="noreferrer"
	title={d.url}
	class="nodrag flex max-w-[200px] items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs text-neutral-100 no-underline shadow hover:border-blue-500"
>
	{#if d.favicon}
		<img
			src={d.favicon}
			alt=""
			class="size-4 shrink-0 rounded-sm"
			onerror={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
		/>
	{:else}
		<span class="size-4 shrink-0 rounded-sm bg-neutral-700"></span>
	{/if}
	<span class="truncate">{d.label}</span>
</a>

<Handle type="target" position={Position.Top} style="opacity:0" isConnectable={false} />
<Handle type="source" position={Position.Bottom} style="opacity:0" isConnectable={false} />
