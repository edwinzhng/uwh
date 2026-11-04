import { expect, test } from "bun:test";
import { createLoadingDelay } from "../src/design-system/loading-delay";

const setup = (): {
	controller: ReturnType<typeof createLoadingDelay>;
	changes: boolean[];
	pending: Map<number, () => void>;
	fire: () => void;
} => {
	const pending = new Map<number, () => void>();
	const state = { id: 0 };
	const changes: boolean[] = [];
	return {
		changes,
		pending,
		controller: createLoadingDelay({
			delay: 150,
			onChange: (visible): void => {
				changes.push(visible);
			},
			schedule: (callback): (() => void) => {
				const id = ++state.id;
				pending.set(id, callback);
				return (): void => {
					pending.delete(id);
				};
			},
		}),
		fire: (): void => {
			const callbacks = [...pending.values()];
			pending.clear();
			for (const callback of callbacks) callback();
		},
	};
};

test("fast reads never flash a spinner and sustained reads disappear immediately on completion or error", (): void => {
	const { controller, changes, fire, pending } = setup();
	controller.update(true);
	controller.update(false);
	fire();
	expect(changes).toEqual([]);
	controller.update(true);
	controller.update(true);
	expect(pending.size).toBe(1);
	fire();
	expect(changes).toEqual([true]);
	controller.update(false);
	expect(changes).toEqual([true, false]);
	expect(pending.size).toBe(0);
});

test("abandoned timers cannot show an indicator after navigation, disposal or reopening", (): void => {
	const { controller, changes, fire, pending } = setup();
	controller.update(true);
	const abandoned = [...pending.values()];
	controller.update(false);
	controller.update(true);
	for (const callback of abandoned) callback();
	expect(changes).toEqual([]);
	fire();
	expect(changes).toEqual([true]);
	controller.update(false);
	controller.update(true);
	const disposed = [...pending.values()];
	controller.dispose();
	for (const callback of disposed) callback();
	expect(changes).toEqual([true, false]);
	expect(pending.size).toBe(0);
});

test("a dialog taking loading ownership cancels the page indicator instead of duplicating it", (): void => {
	const page = setup();
	const dialog = setup();
	page.controller.update(true);
	page.controller.update(false);
	dialog.controller.update(true);
	page.fire();
	dialog.fire();
	expect(page.changes).toEqual([]);
	expect(dialog.changes).toEqual([true]);
	dialog.controller.update(false);
	expect(dialog.changes).toEqual([true, false]);
});
