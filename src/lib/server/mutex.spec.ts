import { describe, it, expect } from 'vitest';
import { createMutex } from './mutex';

describe('createMutex', () => {
	it('serializes sections so they never overlap', async () => {
		const run = createMutex();
		const events: string[] = [];

		const section = (id: string, delay: number) =>
			run(async () => {
				events.push(`${id}:start`);
				await new Promise((r) => setTimeout(r, delay));
				events.push(`${id}:end`);
			});

		// Start B while A is still "running"; B must wait for A to finish.
		await Promise.all([section('A', 20), section('B', 0)]);

		expect(events).toEqual(['A:start', 'A:end', 'B:start', 'B:end']);
	});

	it('keeps running after a section throws', async () => {
		const run = createMutex();
		await expect(run(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
		await expect(run(async () => 42)).resolves.toBe(42);
	});

	it('returns each section’s resolved value', async () => {
		const run = createMutex();
		const results = await Promise.all([run(async () => 1), run(async () => 2), run(async () => 3)]);
		expect(results).toEqual([1, 2, 3]);
	});
});
