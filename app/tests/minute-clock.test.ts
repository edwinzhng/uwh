import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import { futureSignupOpening, signupState } from "../src/domain/event-time";
import {
	nextClockBoundary,
	nextMinuteDelay,
	startMinuteTimer,
} from "../src/shared/minute-timer";

test("clock ticks align to wall-clock minutes and recover from delayed callbacks", (): void => {
	const state: {
		now: number;
		queue: { callback: () => void; delay: number; cancelled: boolean }[];
		notifications: number;
	} = { now: 12500, queue: [], notifications: 0 };
	const stop = startMinuteTimer(
		() => {
			state.notifications += 1;
		},
		{
			now: () => state.now,
			schedule: (callback, delay): (() => void) => {
				const entry = { callback, delay, cancelled: false };
				state.queue.push(entry);
				return (): void => {
					entry.cancelled = true;
				};
			},
		},
	);
	expect(state.queue.at(0)?.delay).toBe(47500);
	state.now = 62500;
	state.queue.at(0)?.callback();
	expect(state.notifications).toBe(1);
	expect(state.queue.at(1)?.delay).toBe(57500);
	stop();
	expect(state.queue.at(1)?.cancelled).toBe(true);
	expect(nextMinuteDelay(60000)).toBe(60000);
	expect(nextMinuteDelay(59999)).toBe(1);
});
test("precise event wakes target opening then closing, never past or distant timestamps", (): void => {
	const opensAt = 120123;
	const closesAt = 180456;
	expect(nextClockBoundary([undefined, opensAt, closesAt], opensAt - 1)).toBe(
		opensAt,
	);
	expect(nextClockBoundary([opensAt, closesAt], opensAt)).toBeUndefined();
	expect(nextClockBoundary([opensAt, closesAt], closesAt - 60000)).toBe(
		closesAt,
	);
	expect(nextClockBoundary([opensAt, closesAt], closesAt)).toBeUndefined();
	const event = initialAppData.events.at(0);
	if (!event) throw new Error("Event fixture missing.");
	const scheduled = {
		...event,
		cancelled: false,
		signup: "scheduled" as const,
		opensAt,
		closesAt,
	};
	expect(signupState(scheduled, opensAt - 1)).toBe("scheduled");
	expect(signupState(scheduled, opensAt)).toBe("open");
	expect(signupState({ ...scheduled, signup: "open" }, closesAt)).toBe(
		"closed",
	);
	expect(signupState({ ...scheduled, cancelled: true }, opensAt)).toBe(
		"closed",
	);
});
test("opening now uses actual time rather than a rounded-down UI minute", (): void => {
	const event = initialAppData.events.at(0);
	if (!event) throw new Error("Event fixture missing.");
	const now = 120123;
	const open = {
		...event,
		cancelled: false,
		signup: "open" as const,
		opensAt: now,
		closesAt: now + 3600000,
	};
	expect(signupState(open, Math.floor(now / 60000) * 60000)).toBe("scheduled");
	expect(signupState(open, now)).toBe("open");
});

test("opening jobs only target future valid windows and never resend immediately-open events", (): void => {
	const event = initialAppData.events.at(0);
	if (!event) throw new Error("Event fixture missing.");
	const scheduled = {
		...event,
		cancelled: false,
		opensAt: 120123,
		closesAt: 180456,
	};
	expect(futureSignupOpening(scheduled, 120122)).toBe(120123);
	expect(futureSignupOpening(scheduled, 120123)).toBeUndefined();
	expect(futureSignupOpening(scheduled, 120124)).toBeUndefined();
	expect(
		futureSignupOpening({ ...scheduled, cancelled: true }, 120122),
	).toBeUndefined();
	expect(
		futureSignupOpening({ ...scheduled, closesAt: 120123 }, 120122),
	).toBeUndefined();
	expect(
		futureSignupOpening({ ...scheduled, closesAt: undefined }, 120122),
	).toBeUndefined();
});
