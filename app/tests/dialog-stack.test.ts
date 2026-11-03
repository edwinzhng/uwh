import { describe, expect, test } from "bun:test";
import {
	type DialogStackEntry,
	dialogCanPresent,
	dialogLayer,
	dialogStack,
	dialogStackGeometry,
} from "../src/design-system/dialog-stack";
import { opacity, space } from "../src/design-system/tokens";

const parent: DialogStackEntry = {
	id: "parent",
	isOpen: true,
	presented: true,
};
const child: DialogStackEntry = {
	id: "child",
	parent: "parent",
	isOpen: true,
	presented: true,
};

describe("retained dialog layers", () => {
	test("orders a parent behind children that register first", (): void => {
		const childFirst = dialogStack([], { type: "upsert", entry: child });
		const entries = dialogStack(childFirst, { type: "upsert", entry: parent });
		expect(entries.map((entry) => entry.id)).toEqual(["parent", "child"]);
		expect(dialogLayer(entries, "parent")).toEqual({
			isTop: false,
			base: true,
			count: 2,
			covered: true,
			depth: 1,
		});
		expect(dialogLayer(entries, "child")).toEqual({
			isTop: true,
			base: false,
			count: 2,
			covered: false,
			depth: 0,
		});
	});

	test("restores the background while a closing child still blocks input", (): void => {
		const entries = dialogStack([parent, child], {
			type: "upsert",
			entry: { ...child, isOpen: false },
		});
		expect(dialogLayer(entries, "parent").depth).toBe(0);
		expect(dialogLayer(entries, "parent").isTop).toBe(false);
		expect(dialogLayer(entries, "parent").covered).toBe(true);
		expect(dialogLayer(entries, "child").isTop).toBe(true);
		const popped = dialogStack(entries, { type: "remove", id: child.id });
		expect(dialogLayer(popped, "parent").isTop).toBe(true);
		expect(dialogLayer(popped, "parent").covered).toBe(false);
	});

	test("keeps one page scrim for deep stacks and transfers it if a base disappears", (): void => {
		const entries = [
			parent,
			child,
			{ id: "grandchild", parent: "child", isOpen: true, presented: true },
			{ id: "fourth", parent: "grandchild", isOpen: true, presented: true },
		];
		expect(
			entries.filter((entry) => dialogLayer(entries, entry.id).base),
		).toHaveLength(1);
		expect(dialogLayer(entries, "parent").depth).toBe(2);
		const removed = dialogStack(entries, { type: "remove", id: "parent" });
		expect(dialogLayer(removed, "child").base).toBe(true);
		expect(dialogLayer(removed, "fourth").isTop).toBe(true);
	});

	test("reopening during exit keeps the same layer and unchanged updates are stable", (): void => {
		const entries = [parent, child];
		expect(dialogStack(entries, { type: "upsert", entry: child })).toBe(
			entries,
		);
		expect(dialogStack(entries, { type: "remove", id: "missing" })).toBe(
			entries,
		);
		const closing = dialogStack(entries, {
			type: "upsert",
			entry: { ...child, isOpen: false },
		});
		const reopened = dialogStack(closing, { type: "upsert", entry: child });
		expect(reopened.map((entry) => entry.id)).toEqual(["parent", "child"]);
		expect(dialogLayer(reopened, "parent").depth).toBe(1);
	});
});

describe("platform modal presentation order", () => {
	test("simultaneously opened children wait for the parent's actual onShow", (): void => {
		const root = { id: "root", isOpen: true };
		const nested = { id: "nested", parent: "root", isOpen: true };
		const childFirst = dialogStack([], { type: "upsert", entry: nested });
		const registered = dialogStack(childFirst, { type: "upsert", entry: root });
		expect(dialogCanPresent(registered, root)).toBe(true);
		expect(dialogCanPresent(registered, nested)).toBe(false);
		expect(dialogLayer(registered, "root").isTop).toBe(true);
		const rootShown = dialogStack(registered, { type: "shown", id: "root" });
		expect(dialogCanPresent(rootShown, nested)).toBe(true);
		expect(dialogLayer(rootShown, "nested").isTop).toBe(true);
		const nestedShown = dialogStack(rootShown, { type: "shown", id: "nested" });
		expect(nestedShown.find((entry) => entry.id === "nested")?.presented).toBe(
			true,
		);
		expect(dialogStack(nestedShown, { type: "shown", id: "nested" })).toBe(
			nestedShown,
		);
	});

	test("waiting children do not present after cancellation or while a parent closes", (): void => {
		const pending = { id: "pending", parent: "parent", isOpen: false };
		const entries = [parent, pending];
		expect(dialogCanPresent(entries, pending)).toBe(false);
		expect(dialogLayer(entries, "parent").isTop).toBe(true);
		const closingParent = { ...parent, isOpen: false };
		expect(
			dialogCanPresent([closingParent], { ...pending, isOpen: true }),
		).toBe(false);
	});

	test("reopen during exit retains presentation without rerunning onShow", (): void => {
		const closing = dialogStack([parent, child], {
			type: "upsert",
			entry: { id: "child", parent: "parent", isOpen: false },
		});
		expect(closing.at(-1)?.presented).toBe(true);
		const reopened = dialogStack(closing, {
			type: "upsert",
			entry: { id: "child", parent: "parent", isOpen: true },
		});
		expect(dialogCanPresent(reopened, reopened.at(-1) ?? child)).toBe(true);
		expect(reopened.at(-1)?.presented).toBe(true);
	});
});

describe("background sheet depth", () => {
	test("reveals a token-sized top edge independently of panel height", (): void => {
		for (const height of [200, 500, 800]) {
			const geometry = dialogStackGeometry(1, height, true);
			expect(geometry.scale).toBe(0.95);
			expect(
				geometry.translateY + (height * (1 - geometry.scale)) / 2,
			).toBeCloseTo(-space.sm);
			expect(geometry.dim).toBe(opacity.backdrop);
		}
	});

	test("bounds deep stacks and restores the original panel", (): void => {
		expect(dialogStackGeometry(0, 500, true)).toEqual({
			scale: 1,
			translateY: 0,
			dim: 0,
		});
		expect(dialogStackGeometry(10, 500, true)).toEqual(
			dialogStackGeometry(2, 500, true),
		);
		expect(dialogStackGeometry(Number.NaN, 500, true).scale).toBe(1);
		expect(dialogStackGeometry(1, 500, false)).toEqual({
			scale: 1,
			translateY: 0,
			dim: opacity.backdrop,
		});
	});

	test("insets a covered panel below the safe top without an initial jump", (): void => {
		const height = 844;
		const safeTop = 47;
		const open = dialogStackGeometry(1, height, true, 0, safeTop);
		expect(open.translateY + (height * (1 - open.scale)) / 2).toBeCloseTo(
			safeTop + space.sm,
		);
		const starting = dialogStackGeometry(0, height, true, 0, safeTop);
		expect(starting.translateY).toBe(0);
		const firstFrame = dialogStackGeometry(0.01, height, true, 0, safeTop);
		expect(
			firstFrame.translateY + (height * (1 - firstFrame.scale)) / 2,
		).toBeCloseTo((safeTop + space.sm) * 0.01);
	});

	test("unequal sheet heights keep only a token-sized edge above the front sheet", (): void => {
		for (const [height, top, frontTop] of [
			[200, 644, 344],
			[500, 344, 644],
		]) {
			if (height === undefined || top === undefined || frontTop === undefined)
				continue;
			const geometry = dialogStackGeometry(1, height, true, top, 47, frontTop);
			const visualTop =
				top + geometry.translateY + (height * (1 - geometry.scale)) / 2;
			expect(visualTop).toBeCloseTo(frontTop - space.sm);
		}
		const entries = dialogStack([parent, child], {
			type: "layout",
			id: child.id,
			frame: { top: 344, height: 500 },
		});
		expect(dialogLayer(entries, parent.id).frontTop).toBe(344);
		expect(
			dialogStack(entries, {
				type: "layout",
				id: child.id,
				frame: { top: 344, height: 500 },
			}),
		).toBe(entries);
	});
});
