import { expect, test } from "bun:test";
import { createPageReadiness } from "../src/design-system/page-readiness";

const setup = (): {
	changes: boolean[];
	frame: () => void;
	controller: ReturnType<typeof createPageReadiness>;
} => {
	const callbacks = new Map<number, () => void>();
	const state = { next: 0 };
	const changes: boolean[] = [];
	const controller = createPageReadiness({
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
