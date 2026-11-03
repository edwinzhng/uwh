import { expect, mock, spyOn, test } from "bun:test";
import { createElement, isValidElement, type ReactElement } from "react";
import { type ToastT, toast } from "sonner";
import type { ToastViewProps } from "../src/design-system/toast-lifetime";

mock.module("../src/design-system/action-toast-view.web", () => ({
	renderActionToast: (props: ToastViewProps): ReactElement =>
		createElement(
			(content: ToastViewProps): string => content.copy.title,
			props,
		),
}));
const { actionToast } = await import("../src/design-system/action-toast.web");

test("repeated profile actions create distinct Sonner toasts with their own details", (): void => {
	actionToast("switchedProfile", "success", { subject: "Sam" });
	actionToast("switchedProfile", "success", { subject: "Edwin" });
	const history = toast
		.getHistory()
		.filter((entry): entry is ToastT => "jsx" in entry);
	const first = history.at(-2);
	const second = history.at(-1);
	expect(first?.id).not.toBe(second?.id);
	if (
		!isValidElement<ToastViewProps>(first?.jsx) ||
		!isValidElement<ToastViewProps>(second?.jsx)
	)
		throw new Error("Missing action toast content");
	expect(first.jsx.props.copy).toEqual({
		title: "Profile view updated",
		description: "Sam",
	});
	expect(second.jsx.props.copy).toEqual({
		title: "Profile view updated",
		description: "Edwin",
	});
	expect(first.closeButton).toBe(false);
	expect(first.duration).toBe(Number.POSITIVE_INFINITY);
	expect(first.jsx.props.duration).toBe(5000);
});

test("custom toast duration controls its own content clock", (): void => {
	actionToast("savedName", "success", {
		subject: "Alex Rivera",
		duration: 1800,
	});
	const entry = toast.getHistory().at(-1);
	if (!entry || !("jsx" in entry) || !isValidElement<ToastViewProps>(entry.jsx))
		throw new Error("Missing action toast content");
	expect(entry.jsx.props.duration).toBe(1800);
	expect(entry.jsx.props.copy.description).toBe("Alex Rivera");
	const dismiss = spyOn(toast, "dismiss").mockReturnValue(entry.id);
	try {
		entry.jsx.props.onExpire();
		expect(dismiss).toHaveBeenCalledWith(entry.id);
	} finally {
		dismiss.mockRestore();
	}
});
