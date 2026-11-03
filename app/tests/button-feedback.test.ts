import { expect, test } from "bun:test";
import { buttonColors } from "../src/design-system/button-colors";
import { activateButton } from "../src/design-system/button-feedback";
import {
	nativeHaptic,
	performOptionalHaptic,
} from "../src/design-system/haptics-policy";
import {
	lightNativeHaptic,
	nativeHapticsAvailable,
} from "../src/design-system/native-haptics.web";
import { darkTheme, lightTheme } from "../src/design-system/tokens";

test("compact buttons reduce horizontal chrome while retaining touch-sized targets", async (): Promise<void> => {
	const button = await Bun.file("src/design-system/button-control.tsx").text();
	expect(button).toContain(
		"minWidth: icon || compact ? controlSize : undefined",
	);
	expect(button).toContain("? space.xs");
	expect(button).toContain("minHeight: controlSize");
});

test("utility selection is neutral and distinct from hover while primary and destructive actions retain their meanings", (): void => {
	for (const theme of [lightTheme, darkTheme]) {
		expect(buttonColors(theme, "secondary", "rest").background).toBe(
			"transparent",
		);
		expect(buttonColors(theme, "secondary", "hover").background).toBe(
			theme.background.hover,
		);
		expect(buttonColors(theme, "selection", "rest", true).background).toBe(
			theme.background.selected,
		);
		expect(buttonColors(theme, "selection", "rest", true).background).not.toBe(
			theme.accent.background,
		);
		expect(buttonColors(theme, "selection", "disabled", true).background).toBe(
			theme.background.secondary,
		);
		expect(buttonColors(theme, "solid", "rest").foreground).toBe(
			theme.accent.foreground,
		);
		expect(buttonColors(theme, "danger", "rest").background).toBe(
			theme.dangerAction.background,
		);
	}
});

test("only a successful enabled valid activation emits one haptic after the action", (): void => {
	const events: string[] = [];
	const action = (): void => {
		events.push("action");
	};
	const haptic = (): void => {
		events.push("haptic");
	};
	for (const input of [
		{ isDisabled: true },
		{ isLoading: true },
		{ validationError: "Choose a value" },
	]) {
		expect(activateButton(input, action, haptic)).toBe(false);
		expect(events).toEqual([]);
	}
	expect(activateButton({}, action, haptic)).toBe(true);
	expect(events).toEqual(["action", "haptic"]);
	expect(() =>
		activateButton(
			{},
			(): void => {
				throw new Error("Activation rejected");
			},
			haptic,
		),
	).toThrow("Activation rejected");
	expect(events).toEqual(["action", "haptic"]);
});

test("rejected validation reports once without performing the action or haptic", (): void => {
	const events: string[] = [];
	const action = (): void => {
		events.push("action");
	};
	const haptic = (): void => {
		events.push("haptic");
	};
	const invalid = (message: string): void => {
		events.push(message);
	};
	expect(
		activateButton(
			{ validationError: "Choose a recipient" },
			action,
			haptic,
			invalid,
		),
	).toBe(false);
	expect(events).toEqual(["Choose a recipient"]);
	expect(
		activateButton(
			{ isDisabled: true, validationError: "Choose a recipient" },
			action,
			haptic,
			invalid,
		),
	).toBe(false);
	expect(events).toEqual(["Choose a recipient"]);
	expect(activateButton({}, action, haptic, invalid)).toBe(true);
	expect(events).toEqual(["Choose a recipient", "action", "haptic"]);
});

test("native light feedback honors its own preference and never selects browser vibration", (): void => {
	expect(
		nativeHaptic({ platform: "ios", enabled: true, available: true }),
	).toBe("light");
	expect(
		nativeHaptic({ platform: "android", enabled: true, available: true }),
	).toBe("context-click");
	for (const platform of ["web", "windows", "macos"])
		expect(
			nativeHaptic({ platform, enabled: true, available: true }),
		).toBeUndefined();
	expect(
		nativeHaptic({ platform: "ios", enabled: false, available: true }),
	).toBeUndefined();
	expect(
		nativeHaptic({ platform: "ios", enabled: true, available: false }),
	).toBeUndefined();
	expect(
		nativeHaptic({ platform: "ios", enabled: true, available: true }),
	).toBe("light");
});

test("missing modules and native haptic failures never interrupt the action", async (): Promise<void> => {
	const calls: string[] = [];
	const perform = async (kind: string): Promise<void> => {
		calls.push(kind);
	};
	await performOptionalHaptic(
		{ platform: "ios", enabled: true, available: false },
		perform,
	);
	await performOptionalHaptic(
		{ platform: "ios", enabled: false, available: true },
		perform,
	);
	await performOptionalHaptic(
		{ platform: "web", enabled: true, available: true },
		perform,
	);
	expect(calls).toEqual([]);
	await performOptionalHaptic(
		{ platform: "ios", enabled: true, available: true },
		perform,
	);
	expect(calls).toEqual(["light"]);
	await expect(
		performOptionalHaptic(
			{ platform: "ios", enabled: true, available: true },
			async (): Promise<void> => {
				throw new Error("Native module unavailable");
			},
		),
	).resolves.toBeUndefined();
	await expect(
		performOptionalHaptic(
			{ platform: "android", enabled: true, available: true },
			(): Promise<void> => {
				throw new Error("Synchronous bridge unavailable");
			},
		),
	).resolves.toBeUndefined();
	expect(nativeHapticsAvailable()).toBe(false);
	await expect(lightNativeHaptic(true)).resolves.toBeUndefined();
});
