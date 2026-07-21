<script lang="ts">
	import Dialog from '$lib/components/Dialog.svelte';
	import { secondaryButton } from '$lib/components/ui';
	import { theme } from '$lib/theme/theme.svelte';
	import {
		PREFERENCE_ORDER,
		preferenceIcon,
		preferenceLabel,
		type ThemePreference
	} from '$lib/theme';
	import { appearance } from './appearance.svelte';
	import ChoicePicker from './ChoicePicker.svelte';
	import { FONTS, type FontId } from './fonts';
	import { FONT_SIZES, type FontSizeId } from './fontSizes';

	/**
	 * Everything about how the app looks, in one place.
	 *
	 * Each choice applies the moment it is picked, so there is nothing to save and
	 * nothing to cancel — you see the result behind the dialog while choosing. That is
	 * also why the dialog is dismissable: a stray click costs nothing here.
	 */
	let { onclose }: { onclose: () => void } = $props();

	/** `system` has no registry entry of its own, so the list is built from ids. */
	const themeChoices = $derived(
		PREFERENCE_ORDER.map((preference) => ({
			id: preference,
			label: `${preferenceIcon(preference)}  ${preferenceLabel(preference)}`
		}))
	);

	const resolved = $derived(theme.current);
</script>

<Dialog title="Appearance" dismissable {onclose}>
	<ChoicePicker
		label="Theme"
		choices={themeChoices}
		value={theme.preference}
		onpick={(id: ThemePreference) => theme.set(id)}
	/>
	{#if theme.preference === 'system'}
		<p class="text-xs text-faint">Following your system, which is currently {resolved}.</p>
	{/if}

	<ChoicePicker
		label="Font"
		choices={FONTS}
		value={appearance.font}
		onpick={(id: FontId) => appearance.setFont(id)}
		describe={(choice) => `font-family: ${FONTS.find((f) => f.id === choice.id)?.stack}`}
	/>

	<ChoicePicker
		label="Text size"
		choices={FONT_SIZES}
		value={appearance.fontSize}
		onpick={(id: FontSizeId) => appearance.setFontSize(id)}
	/>

	<p class="text-xs text-faint">
		Kept in this browser, and applied before the page draws so it never flashes.
	</p>

	<div class="flex justify-end pt-1">
		<button type="button" onclick={onclose} class={secondaryButton}>Close</button>
	</div>
</Dialog>
