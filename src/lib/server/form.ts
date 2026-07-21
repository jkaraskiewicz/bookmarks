import { invalid } from './errors';

/**
 * Reading submitted form fields.
 *
 * A `FormData` entry is `string | File | null`, so every read needs the same
 * coercion before it is worth anything. Doing that here keeps each action about what
 * it does rather than about unwrapping its input, and gives "this field is required"
 * a single definition instead of one per action.
 */

/** A text field's trimmed value, or `''` when absent (or when it holds a file). */
export function textField(form: FormData, name: string): string {
	const value = form.get(name);
	return typeof value === 'string' ? value.trim() : '';
}

/** A text field's value, or `undefined` when it is absent or blank. */
export function optionalField(form: FormData, name: string): string | undefined {
	return textField(form, name) || undefined;
}

/** A text field that must be there. Throws a 400 carrying `whenMissing`. */
export function requiredField(form: FormData, name: string, whenMissing: string): string {
	return textField(form, name) || raise(whenMissing);
}

/** Every value of a repeated field — how a bulk action submits its selection. */
export function repeatedField(form: FormData, name: string): string[] {
	return form.getAll(name).map(String).filter(Boolean);
}

/** An uploaded file, or `undefined` when nothing was chosen. */
export function upload(form: FormData, name: string): File | undefined {
	const value = form.get(name);
	return value instanceof File && value.size > 0 ? value : undefined;
}

/** A file upload that must be there. Throws a 400 carrying `whenMissing`. */
export function requiredUpload(form: FormData, name: string, whenMissing: string): File {
	return upload(form, name) ?? raise(whenMissing);
}

/** Kept separate so the readers above stay single expressions. */
function raise(message: string): never {
	throw invalid(message);
}
