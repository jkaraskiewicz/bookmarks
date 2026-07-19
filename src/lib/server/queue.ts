/**
 * A background work queue with a concurrency limit.
 *
 * Without one, "refresh these 300 bookmarks" opens 300 sockets at once — rude to the
 * sites being fetched and liable to exhaust local file descriptors. The queue lets a
 * caller hand over all the work and have it paced, rather than the caller guessing at
 * a safe batch size and silently dropping the rest.
 */
export interface Queue {
	/** Hand a task to the queue. Runs when a slot frees up. Never throws. */
	push(task: () => Promise<unknown>): void;
	/** How many tasks are waiting or running. */
	readonly size: number;
}

export function createQueue(concurrency: number): Queue {
	const waiting: (() => Promise<unknown>)[] = [];
	let running = 0;

	function pump(): void {
		while (running < concurrency && waiting.length > 0) {
			const task = waiting.shift()!;
			running++;
			// A failing task must not stall the queue, so swallow here; callers that
			// care about errors handle them inside their own task.
			void Promise.resolve()
				.then(task)
				.catch(() => {})
				.finally(() => {
					running--;
					pump();
				});
		}
	}

	return {
		push(task) {
			waiting.push(task);
			pump();
		},
		get size() {
			return waiting.length + running;
		}
	};
}
