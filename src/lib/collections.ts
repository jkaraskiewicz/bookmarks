import type { Bookmark } from './types';

/** A node in the nested collection tree built from `/`-separated collection paths. */
export interface TreeNode {
	/** Leaf segment, e.g. "Frameworks". */
	name: string;
	/** Full path, e.g. "Dev/Frameworks". */
	path: string;
	/** Number of bookmarks at or below this node. */
	count: number;
	children: TreeNode[];
}

/** Split a collection string into its cleaned path segments. */
function segmentsOf(collection: string): string[] {
	return collection
		.split('/')
		.map((s) => s.trim())
		.filter(Boolean);
}

/** Build a nested tree from every bookmark's collection path, sorted alphabetically. */
export function buildCollectionTree(bookmarks: Bookmark[]): TreeNode[] {
	const roots: TreeNode[] = [];
	const index = new Map<string, TreeNode>();

	for (const { collection } of bookmarks) {
		if (!collection) continue;
		let siblings = roots;
		let path = '';
		for (const name of segmentsOf(collection)) {
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

	sortTree(roots);
	return roots;
}

function sortTree(nodes: TreeNode[]): void {
	nodes.sort((a, b) => a.name.localeCompare(b.name));
	nodes.forEach((n) => sortTree(n.children));
}

/** Every collection path in the tree, flattened and sorted (e.g. for autocomplete). */
export function flattenCollectionTree(nodes: TreeNode[]): string[] {
	return nodes.flatMap((n) => [n.path, ...flattenCollectionTree(n.children)]).sort();
}

/** Whether a bookmark's collection matches a selected node — itself or any descendant. */
export function inCollection(collection: string | undefined, selected: string): boolean {
	if (!selected) return true;
	return collection === selected || !!collection?.startsWith(selected + '/');
}
