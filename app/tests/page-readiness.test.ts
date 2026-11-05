import { expect, test } from "bun:test";
import { createPageReadiness } from "../src/design-system/page-readiness";

const setup = (
	waitForLayout = true,
): {
	changes: boolean[];
	frame: () => void;
	controller: ReturnType<typeof createPageReadiness>;
} => {
	const callbacks = new Map<number, () => void>();
	const state = { next: 0 };
	const changes: boolean[] = [];
	const controller = createPageReadiness({
		waitForLayout,
		onChange: (ready): void => {
			changes.push(ready);
		},
		scheduleFrame: (callback): (() => void) => {
			const id = state.next++;
			callbacks.set(id, callback);
			return (): void => {
				callbacks.delete(id);
			};
		},
	});
	return {
		changes,
		controller,
		frame: (): void => {
			const pending = [...callbacks.values()];
			callbacks.clear();
			for (const callback of pending) callback();
		},
	};
};

test("tab content responds immediately when data is ready and still waits for an initial query", (): void => {
	const { controller, changes } = setup(false);
	controller.update(false, false, "attendance");
	expect(changes).toEqual([true]);
	controller.update(false, true, "coaching");
	expect(changes).toEqual([true, false]);
	controller.update(false, false, "coaching");
	expect(changes).toEqual([true, false, true]);
	controller.update(false, true, "coaching");
	expect(changes).toEqual([true, false, true]);
});

test("a new page reveals only after its initial queries and layout frames settle", (): void => {
	const { controller, frame, changes } = setup();
	controller.update(true, false);
	frame();
	frame();
	expect(changes).toEqual([]);
	controller.update(false, true);
	frame();
	frame();
	expect(changes).toEqual([]);
	controller.update(false, false);
	frame();
	expect(changes).toEqual([]);
	frame();
	expect(changes).toEqual([true]);
	controller.update(false, true);
	expect(changes).toEqual([true]);
});

test("layout changes and newly discovered queries interrupt an unfinished reveal", (): void => {
	const { controller, frame, changes } = setup();
	controller.update(false, false);
	frame();
	controller.layout();
	frame();
	expect(changes).toEqual([]);
	controller.update(false, true);
	frame();
	expect(changes).toEqual([]);
	controller.update(false, false);
	frame();
	frame();
	expect(changes).toEqual([true]);
});

test("route data changes block interaction again but pagination never blanks a visible page", (): void => {
	const { controller, frame, changes } = setup();
	controller.update(false, false);
	frame();
	frame();
	controller.update(false, true);
	expect(changes).toEqual([true]);
	controller.update(true, false);
	expect(changes).toEqual([true, false]);
	controller.update(false, true);
	frame();
	frame();
	expect(changes).toEqual([true, false]);
	controller.update(false, false);
	frame();
	frame();
	expect(changes).toEqual([true, false, true]);
});

test("leaving a page cancels pending work without a late reveal", (): void => {
	const { controller, frame, changes } = setup();
	controller.update(false, false);
	frame();
	controller.dispose();
	frame();
	expect(changes).toEqual([]);
});

test("a feedback deep link never reveals a previously ready membership tab", (): void => {
	const { controller, frame, changes } = setup();
	controller.update(false, false, "membership");
	frame();
	frame();
	expect(changes).toEqual([true]);
	controller.update(false, true, "feedback");
	expect(changes).toEqual([true, false]);
	frame();
	frame();
	expect(changes).toEqual([true, false]);
	controller.update(false, false, "feedback");
	frame();
	frame();
	expect(changes).toEqual([true, false, true]);
});

test("late home queries hold the entire initial layout until every dependency resolves", (): void => {
	const { controller, frame, changes } = setup();
	controller.update(true, false, "home");
	frame();
	controller.update(false, true, "home");
	frame();
	frame();
	expect(changes).toEqual([]);
	controller.update(false, false, "home");
	frame();
	controller.update(false, true, "home");
	frame();
	frame();
	expect(changes).toEqual([]);
	controller.update(false, false, "home");
	frame();
	frame();
	expect(changes).toEqual([true]);
	controller.update(false, true, "home");
	expect(changes).toEqual([true]);
});

test("rapid tab changes cancel the abandoned tab's pending reveal", (): void => {
	const { controller, frame, changes } = setup();
	controller.update(false, false, "feedback");
	frame();
	controller.update(false, true, "fitness");
	frame();
	frame();
	expect(changes).toEqual([]);
	controller.update(false, false, "fitness");
	frame();
	controller.update(false, true, "feedback");
	frame();
	frame();
	expect(changes).toEqual([]);
	controller.update(false, false, "feedback");
	frame();
	frame();
	expect(changes).toEqual([true]);
});

test("changing a tab hides only that tab while the revealed outer page stays interactive", () => {
	const page = setup();
	const section = setup();
	page.controller.update(false, true, "account-one");
	section.controller.update(false, false, "feedback");
	section.frame();
	section.frame();
	page.controller.update(false, false, "account-one");
	page.frame();
	page.frame();
	expect(page.changes).toEqual([true]);
	section.controller.update(false, true, "attendance");
	page.controller.update(false, true, "account-one");
	page.frame();
	page.frame();
	expect(section.changes).toEqual([true, false]);
	expect(page.changes).toEqual([true]);
	section.controller.update(false, false, "attendance");
	section.frame();
	section.frame();
	expect(section.changes).toEqual([true, false, true]);
});
