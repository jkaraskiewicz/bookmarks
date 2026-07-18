<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';

	let { data }: NodeProps = $props();
	const d = $derived(data as { label: string; degree: number });
</script>

<div
	title="{d.degree} bookmarks"
	class="nodrag flex items-center gap-1 rounded-md bg-emerald-700/80 px-3 py-1 text-xs font-medium text-white shadow"
>
	<span aria-hidden="true">📁</span>
	{d.label}
</div>

<Handle type="target" position={Position.Top} style="opacity:0" isConnectable={false} />
<Handle type="source" position={Position.Bottom} style="opacity:0" isConnectable={false} />
