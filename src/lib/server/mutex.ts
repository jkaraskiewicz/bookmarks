/**
 * A simple async mutex. `run(fn)` queues `fn` so that queued sections never
 * overlap — used to serialize read-modify-write cycles against a single file.
 */
export function createMutex() {
	let tail: Promise<unknown> = Promise.resolve();
	return function run<T>(fn: () => Promise<T>): Promise<T> {
		const result = tail.then(fn, fn);
		// Keep the chain alive regardless of success/failure, but don't leak the value.
		tail = result.then(
			() => undefined,
			() => undefined
		);
		return result;
	};
}
