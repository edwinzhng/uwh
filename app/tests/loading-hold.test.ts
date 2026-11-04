import { expect, test } from "bun:test";
import { createLoadingHold } from "../src/design-system/loading-hold";

const setup = (): {
	changes: boolean[];
	hold: ReturnType<typeof createLoadingHold>;
	advance: (elapsed: number) => void;
	pending: Map<number, { due: number; callback: () => void }>;
} => {
	const state = { now: 0, id: 0 };
	const changes: boolean[] = [];
	const pending = new Map<number, { due: number; callback: () => void }>();
	const hold = createLoadingHold({
		minimum: 2000,
		onChange: (visible): void => {
			changes.push(visible);
		},
		clock: {
			now: (): number => state.now,
			schedule: (callback, delay): (() => void) => {
				const id = ++state.id;
				pending.set(id, { due: state.now + delay, callback });
				return (): void => {
					pending.delete(id);
				};
			},
		},
	});
	return {
		hold,
		changes,
		pending,
		advance: (elapsed): void => {
			state.now += elapsed;
			for (const [id, task] of pending)
				if (task.due <= state.now) {
					pending.delete(id);
					task.callback();
				}
		},
	};
};

test("fast loading stays visible for two seconds, then disappears immediately", (): void => {
	const { hold, changes, advance } = setup();
	hold.setLoading(true);
	advance(100);
	hold.setLoading(false);
	advance(1899);
	expect(changes).toEqual([true]);
	advance(1);
	expect(changes).toEqual([true, false]);
});

test("slow loading is never hidden before completion and adds no extra wait", (): void => {
	const { hold, changes, advance, pending } = setup();
	hold.setLoading(true);
	advance(5000);
	expect(changes).toEqual([true]);
	hold.setLoading(false);
	expect(changes).toEqual([true, false]);
	expect(pending.size).toBe(0);
});

test("new work cancels a pending dismissal and a new visible period gets its own minimum", (): void => {
	const { hold, changes, advance } = setup();
	hold.setLoading(true);
	hold.setLoading(false);
	advance(1000);
	hold.setLoading(true);
	advance(2000);
	expect(changes).toEqual([true]);
	hold.setLoading(false);
	hold.setLoading(true);
	hold.setLoading(false);
	advance(1999);
	expect(changes).toEqual([true, false, true]);
	advance(1);
	expect(changes).toEqual([true, false, true, false]);
});

test("unmount cancels the timer without updating an unmounted view", (): void => {
	const { hold, changes, pending, advance } = setup();
	hold.setLoading(false);
	expect(changes).toEqual([]);
	hold.setLoading(true);
	hold.setLoading(false);
	hold.dispose();
	advance(3000);
	expect(pending.size).toBe(0);
	expect(changes).toEqual([true]);
});
