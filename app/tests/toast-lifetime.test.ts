import { expect, test } from "bun:test";
import {
	defaultToastDuration,
	startToastLifetime,
	toastDuration,
	toastRemaining,
} from "../src/design-system/toast-lifetime";

const fixture = (
	duration: number,
	startedAt = 0,
): {
	state: { now: number; expired: number; progress: number[] };
	pending: Map<number, { callback: () => void; delay: number }>;
	advance: (now: number) => void;
	dispose: () => void;
} => {
	const state: {
		now: number;
		expired: number;
		progress: number[];
		sequence: number;
	} = {
		now: startedAt,
		expired: 0,
		progress: [],
		sequence: 0,
	};
	const pending = new Map<number, { callback: () => void; delay: number }>();
	const dispose = startToastLifetime({
		startedAt,
		duration,
		onProgress: (remaining): void => {
			state.progress.push(remaining);
		},
		onExpire: (): void => {
			state.expired += 1;
		},
		clock: {
			now: (): number => state.now,
			schedule: (callback, delay): (() => void) => {
				const id = state.sequence++;
				pending.set(id, { callback, delay });
				return (): void => {
					pending.delete(id);
				};
			},
		},
	});
	return {
		state,
		pending,
		dispose,
		advance: (now): void => {
			state.now = now;
			const tasks = [...pending.values()];
			pending.clear();
			for (const task of tasks) task.callback();
		},
	};
};

test("progress and dismissal share the custom duration deadline", (): void => {
	const clock = fixture(2500);
	expect(clock.state.progress.at(-1)).toBe(1);
	expect(clock.pending.size).toBe(1);
	clock.advance(1250);
	expect(clock.state.progress.at(-1)).toBe(0.5);
	expect(clock.state.expired).toBe(0);
	expect(clock.pending.size).toBe(1);
	clock.advance(2500);
	expect(clock.state.progress.at(-1)).toBe(0);
	expect(clock.state.expired).toBe(1);
	expect(clock.pending.size).toBe(0);
	clock.advance(9000);
	expect(clock.state.expired).toBe(1);
});

test("final scheduled tick matches the exact deadline rather than sample cadence", (): void => {
	const clock = fixture(250);
	clock.advance(200);
	expect([...clock.pending.values()].at(0)?.delay).toBe(50);
	clock.advance(250);
	expect(clock.state.expired).toBe(1);
});

test("background delay does not restart or pause the lifetime", (): void => {
	const clock = fixture(5000);
	clock.advance(8000);
	expect(clock.state.progress.at(-1)).toBe(0);
	expect(clock.state.expired).toBe(1);
	expect(clock.pending.size).toBe(0);
});

test("cleanup cancels the only scheduled callback", (): void => {
	const clock = fixture(5000);
	clock.dispose();
	clock.dispose();
	expect(clock.pending.size).toBe(0);
	clock.advance(8000);
	expect(clock.state.expired).toBe(0);
});

test("remaining time is clamped and custom duration cannot make an immortal toast", (): void => {
	expect(toastRemaining(1000, 5000, 500)).toBe(1);
	expect(toastRemaining(1000, 5000, 3500)).toBe(0.5);
	expect(toastRemaining(1000, 5000, 7000)).toBe(0);
	for (const input of [undefined, 0, -5, Number.NaN, Number.POSITIVE_INFINITY])
		expect(toastDuration(input)).toBe(defaultToastDuration);
	expect(toastDuration(1800)).toBe(1800);
});

test("smooth progress needs one deadline callback without React sampling", (): void => {
	const callbacks: { callback: () => void; delay: number }[] = [];
	const clock = { now: 1500, expired: 0 };
	startToastLifetime({
		startedAt: 1000,
		duration: 5000,
		onExpire: (): void => {
			clock.expired += 1;
		},
		clock: {
			now: (): number => clock.now,
			schedule: (callback, delay): (() => void) => {
				callbacks.push({ callback, delay });
				return (): void => {};
			},
		},
	});
	expect(callbacks).toHaveLength(1);
	expect(callbacks.at(0)?.delay).toBe(4500);
	clock.now = 6000;
	callbacks.at(0)?.callback();
	expect(clock.expired).toBe(1);
	expect(callbacks).toHaveLength(1);
});
