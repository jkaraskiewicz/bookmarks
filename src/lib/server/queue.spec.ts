import { describe, it, expect } from 'vitest';
import { createQueue } from './queue';

/** A task that resolves when you tell it to, so concurrency can be observed. */
function deferred() {
	let release!: () => void;
	const promise = new Promise<void>((resolve) => (release = resolve));
	return { promise, release };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('createQueue', () => {
	it('runs a task', async () => {
		const queue = createQueue(2);
		let ran = false;
		queue.push(async () => {
			ran = true;
		});
		await tick();
		expect(ran).toBe(true);
	});

	it('never runs more than the limit at once', async () => {
		const queue = createQueue(2);
		const gates = [deferred(), deferred(), deferred(), deferred()];
		let running = 0;
		let peak = 0;

		for (const gate of gates) {
			queue.push(async () => {
				running++;
				peak = Math.max(peak, running);
				await gate.promise;
				running--;
			});
		}

		await tick();
		expect(peak).toBe(2);

		// Releasing one frees exactly one slot.
		gates[0].release();
		await tick();
		expect(peak).toBe(2);

		for (const gate of gates) gate.release();
		await tick();
		await tick();
		expect(running).toBe(0);
	});

	it('starts waiting tasks as slots free up', async () => {
		const queue = createQueue(1);
		const order: number[] = [];
		const gates = [deferred(), deferred()];

		queue.push(async () => {
			order.push(1);
			await gates[0].promise;
		});
		queue.push(async () => {
			order.push(2);
			await gates[1].promise;
		});

		await tick();
		expect(order).toEqual([1]); // second is still waiting

		gates[0].release();
		await tick();
		expect(order).toEqual([1, 2]);

		gates[1].release();
		await tick();
	});

	it('keeps going when a task fails', async () => {
		const queue = createQueue(1);
		const done: string[] = [];

		queue.push(async () => {
			throw new Error('boom');
		});
		queue.push(async () => {
			done.push('after');
		});

		await tick();
		await tick();
		expect(done).toEqual(['after']);
	});

	it('survives a task that throws synchronously', async () => {
		const queue = createQueue(1);
		const done: string[] = [];

		queue.push(() => {
			throw new Error('sync boom');
		});
		queue.push(async () => {
			done.push('after');
		});

		await tick();
		await tick();
		expect(done).toEqual(['after']);
	});

	it('reports how much work is outstanding', async () => {
		const queue = createQueue(1);
		const gates = [deferred(), deferred()];
		expect(queue.size).toBe(0);

		queue.push(async () => await gates[0].promise);
		queue.push(async () => await gates[1].promise);
		expect(queue.size).toBe(2);

		gates[0].release();
		await tick();
		expect(queue.size).toBe(1);

		gates[1].release();
		await tick();
		expect(queue.size).toBe(0);
	});
});
