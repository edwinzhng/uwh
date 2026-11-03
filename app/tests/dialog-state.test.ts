import { describe, expect, test } from "bun:test";
import {
	canDismissDialog,
	canStartSheetDrag,
	dialogContentWidth,
	dialogMaxHeight,
	dialogPresentation,
	dialogRetention,
	dialogStepChanged,
	dialogTransitionDuration,
	initialDialogRetention,
	sheetDragOffset,
	shouldDismissSheet,
} from "../src/design-system/dialog-state";
import { motion } from "../src/design-system/tokens";

describe("responsive dialog geometry", () => {
	test("uses bounded sheets below the web sidebar boundary", (): void => {
		expect(dialogPresentation(390)).toBe("sheet");
		expect(dialogPresentation(480)).toBe("sheet");
		expect(dialogPresentation(481)).toBe("sheet");
		expect(dialogPresentation(844)).toBe("sheet");
		expect(dialogPresentation(899)).toBe("sheet");
		expect(dialogPresentation(900)).toBe("dialog");
		expect(dialogPresentation(1440)).toBe("dialog");
	});

	test("native dialogs never become centered panels after rotation or on tablets", (): void => {
		for (const width of [320, 390, 844, 1024, 1366]) {
			expect(dialogPresentation(width, "native")).toBe("sheet");
		}
	});

	test("caps sheets at 85 percent while respecting a tall safe top inset", (): void => {
		expect(dialogMaxHeight("sheet", 844, 47, 34)).toBe(717.4);
		expect(dialogMaxHeight("sheet", 400, 90, 34)).toBe(310);
		expect(dialogMaxHeight("sheet", 300, 0, 0)).toBe(255);
		expect(dialogMaxHeight("sheet", 40, 60, 0)).toBe(0);
	});

	test("keeps desktop gutters and keyboard-sized bounds", (): void => {
		expect(dialogMaxHeight("dialog", 900, 0, 0)).toBe(852);
		expect(dialogMaxHeight("dialog", 900, 40, 34)).toBe(826);
		expect(dialogMaxHeight("sheet", 320, 47, 0)).toBe(272);
		expect(dialogMaxHeight("dialog", 20, 0, 0)).toBe(0);
	});

	test("sizes dialogs by content without changing mobile presentation", (): void => {
		expect(dialogContentWidth("form")).toBe(720);
		expect(dialogContentWidth("detail")).toBe(720);
		expect(dialogContentWidth("confirmation")).toBe(480);
		expect(dialogContentWidth("picker")).toBe(480);
		expect(dialogContentWidth("lineup")).toBeGreaterThan(
			dialogContentWidth("detail"),
		);
	});
});

describe("controlled dialog lifecycle", () => {
	test("busy or covered dialogs cannot dismiss through any shared control", (): void => {
		expect(
			canDismissDialog({ isOpen: true, isTop: true, isDismissDisabled: false }),
		).toBe(true);
		expect(
			canDismissDialog({ isOpen: true, isTop: true, isDismissDisabled: true }),
		).toBe(false);
		expect(
			canDismissDialog({
				isOpen: true,
				isTop: false,
				isDismissDisabled: false,
			}),
		).toBe(false);
		expect(
			canDismissDialog({
				isOpen: false,
				isTop: true,
				isDismissDisabled: false,
			}),
		).toBe(false);
	});
	test("moves step focus only for an open workflow transition", (): void => {
		expect(dialogStepChanged(undefined, "edit", true)).toBe(false);
		expect(dialogStepChanged("edit", "edit", true)).toBe(false);
		expect(dialogStepChanged("edit", "review", false)).toBe(false);
		expect(dialogStepChanged("edit", undefined, true)).toBe(false);
		expect(dialogStepChanged("edit", "review", true)).toBe(true);
		expect(dialogStepChanged("review", "edit", true)).toBe(true);
	});
	test("retains only an accepted animated close until its matching exit finishes", (): void => {
		const open = initialDialogRetention(true);
		const closing = dialogRetention(open, {
			type: "visibility",
			isOpen: false,
			animate: true,
			transition: 1,
		});
		expect(closing.retained).toBe(true);
		expect(dialogRetention(closing, { type: "exited", transition: 1 })).toEqual(
			{
				isOpen: false,
				retained: false,
				transition: 1,
			},
		);
		expect(dialogRetention(open, { type: "exited", transition: 0 })).toBe(open);
	});

	test("ignores an old close completion after a reopen or a newer transition", (): void => {
		const closing = dialogRetention(initialDialogRetention(true), {
			type: "visibility",
			isOpen: false,
			animate: true,
			transition: 1,
		});
		const reopened = dialogRetention(closing, {
			type: "visibility",
			isOpen: true,
			animate: true,
			transition: 2,
		});
		expect(dialogRetention(reopened, { type: "exited", transition: 1 })).toBe(
			reopened,
		);
		expect(
			dialogRetention(reopened, {
				type: "visibility",
				isOpen: false,
				animate: true,
				transition: 1,
			}),
		).toBe(reopened);
	});

	test("reduced motion closes immediately and an untouched closed dialog stays unmounted", (): void => {
		expect(
			dialogRetention(initialDialogRetention(true), {
				type: "visibility",
				isOpen: false,
				animate: false,
				transition: 1,
			}).retained,
		).toBe(false);
		expect(
			dialogRetention(initialDialogRetention(false), {
				type: "visibility",
				isOpen: false,
				animate: true,
				transition: 1,
			}).retained,
		).toBe(false);
		expect(dialogTransitionDuration(false)).toBe(motion.duration.instant);
		expect(dialogTransitionDuration(true)).toBe(motion.duration.standard);
	});
});

describe("header-only sheet drag", () => {
	test("starts only intentional downward vertical gestures", (): void => {
		expect(canStartSheetDrag(0, 12)).toBe(true);
		expect(canStartSheetDrag(12, 12)).toBe(false);
		expect(canStartSheetDrag(20, 10)).toBe(false);
		expect(canStartSheetDrag(0, 2)).toBe(false);
		expect(canStartSheetDrag(0, -120)).toBe(false);
		expect(canStartSheetDrag(Number.NaN, 120)).toBe(false);
	});

	test("requests dismissal at 100px and otherwise settles without changing controlled open state", (): void => {
		expect(shouldDismissSheet(99)).toBe(false);
		expect(shouldDismissSheet(100)).toBe(true);
		expect(shouldDismissSheet(180)).toBe(true);
		expect(shouldDismissSheet(-180)).toBe(false);
		expect(shouldDismissSheet(Number.POSITIVE_INFINITY)).toBe(false);
		expect(sheetDragOffset(-30)).toBe(0);
		expect(sheetDragOffset(50)).toBe(50);
		expect(sheetDragOffset(Number.NaN)).toBe(0);
	});
});
