import { fail, type ActionFailure } from '@sveltejs/kit';
import { DomainError } from './errors';

/**
 * Wrap a form action so a thrown {@link DomainError} becomes a `fail()` with its own
 * status and message, instead of each action repeating the same try/catch. Anything
 * else propagates untouched — a real bug should surface as a 500, not be presented to
 * the user as a validation message.
 */
export function guard<T>(run: () => Promise<T>): Promise<T | ActionFailure<{ message: string }>> {
	return run().catch((err) => {
		if (err instanceof DomainError) return fail(err.status, { message: err.message });
		throw err;
	});
}
