/**
 * An error caused by the request rather than by a fault — a missing field, a
 * duplicate URL, a bookmark that isn't there. Carries the HTTP status the route
 * should answer with, so routes don't have to map messages back to codes.
 *
 * Anything that is *not* a DomainError is a genuine bug and should surface as a 500
 * rather than being quietly turned into a form message.
 */
export class DomainError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message);
		this.name = 'DomainError';
	}
}

/** Thrown when a request refers to a bookmark that does not exist. */
export function notFound(message = 'Bookmark not found.'): DomainError {
	return new DomainError(message, 404);
}

/** Thrown when a request would collide with an existing bookmark. */
export function conflict(message: string): DomainError {
	return new DomainError(message, 409);
}

/** Thrown when a required field is missing or empty. */
export function invalid(message: string): DomainError {
	return new DomainError(message, 400);
}
