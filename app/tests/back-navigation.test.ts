import { expect, test } from "bun:test";
import { backNavigationButton } from "../src/design-system/back-navigation-model";

test("page back buttons use one icon while retaining their destination and accessible name", (): void => {
	const onPress = (): void => undefined;
	const back = backNavigationButton({
		label: "Schedule",
		prefix: "arrowLeft",
		onPress,
	});
	expect(back.icon).toBe("arrowLeft");
	expect(back.prefix).toBeUndefined();
	expect(back.accessibilityLabel).toBe("Back to Schedule");
	expect(back.onPress).toBe(onPress);
	expect(
		backNavigationButton({
			label: "Back to practice",
			icon: "arrowLeft",
			onPress,
		}).accessibilityLabel,
	).toBe("Back to practice");
	expect(
		backNavigationButton({
			label: "Home",
			prefix: "arrowLeft",
			accessibilityLabel: "Back to Home from Account",
			onPress,
		}).accessibilityLabel,
	).toBe("Back to Home from Account");
});

test("other toolbar actions keep their label treatment", (): void => {
	const action = {
		label: "Next",
		prefix: "arrowRight" as const,
		onPress: (): void => undefined,
	};
	expect(backNavigationButton(action)).toBe(action);
});

test("Back returns through actual history instead of following a hard-coded parent destination", (): void => {
	const visited: string[] = [];
	const history = ["/conversation?id=program", "/session?event=practice"];
	const back = backNavigationButton(
		{
			label: "Schedule",
			prefix: "arrowLeft",
			onPress: (): void => {
				visited.push("/schedule");
			},
		},
		{
			canGoBack: (): boolean => history.length > 1,
			back: (): void => {
				history.pop();
				visited.push(history.at(-1) ?? "missing");
			},
		},
	);
	expect(back.accessibilityLabel).toBe("Back");
	back.onPress();
	expect(visited).toEqual(["/conversation?id=program"]);
	back.onPress();
	expect(visited).toEqual(["/conversation?id=program", "/schedule"]);
});

test("Back checks history at press time and preserves unavailable-history fallback and disabled controls", (): void => {
	const history: string[] = [];
	const visited: string[] = [];
	const back = backNavigationButton(
		{
			label: "Chats",
			icon: "arrowLeft",
			isDisabled: true,
			onPress: (): void => {
				visited.push("fallback");
			},
		},
		{
			canGoBack: (): boolean => history.length > 0,
			back: (): void => {
				visited.push("history");
			},
		},
	);
	expect(back.accessibilityLabel).toBe("Back to Chats");
	expect(back.isDisabled).toBe(true);
	history.push("previous");
	back.onPress();
	expect(visited).toEqual(["history"]);
});

test("adjacent non-back actions are never redirected through history", (): void => {
	const action = {
		label: "Next",
		prefix: "arrowRight" as const,
		onPress: (): void => undefined,
	};
	expect(
		backNavigationButton(action, {
			canGoBack: (): boolean => true,
			back: (): void => {
				throw new Error("Unexpected history");
			},
		}),
	).toBe(action);
});
