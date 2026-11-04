import { expect, test } from "bun:test";
import { subscribeRenderActivity } from "../src/design-system/render-activity";

const activity = (): {
	read: () => boolean;
	subscribe: (notify: () => void) => () => void;
	set: (active: boolean) => void;
	listeners: Set<() => void>;
} => {
	const state = { active: true };
	const listeners = new Set<() => void>();
	return {
		read: (): boolean => state.active,
		subscribe: (notify): (() => void) => {
			listeners.add(notify);
			return (): void => {
				listeners.delete(notify);
			};
		},
		set: (active): void => {
			state.active = active;
			for (const notify of listeners) notify();
		},
		listeners,
	};
};

test("rendering stops on blur or background without waiting for a component render", (): void => {
	const app = activity();
	const focus = activity();
	const changes: boolean[] = [];
	const unsubscribe = subscribeRenderActivity([app, focus], (active): void => {
		changes.push(active);
	});
	focus.set(false);
	app.set(false);
	focus.set(true);
	app.set(true);
	expect(changes).toEqual([true, false, true]);
	unsubscribe();
	expect(changes).toEqual([true, false, true, false]);
	expect(app.listeners.size + focus.listeners.size).toBe(0);
	app.set(false);
	expect(changes).toHaveLength(4);
});

test("repeated activity signals do not restart an already running loop", (): void => {
	const focus = activity();
	const changes: boolean[] = [];
	const unsubscribe = subscribeRenderActivity([focus], (active): void => {
		changes.push(active);
	});
	focus.set(true);
	focus.set(true);
	focus.set(false);
	focus.set(false);
	unsubscribe();
	expect(changes).toEqual([true, false]);
});
