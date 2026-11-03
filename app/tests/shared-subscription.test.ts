import { expect, test } from "bun:test";
import { createSharedSubscription } from "../src/shared/shared-subscription";

test("multiple consumers share one source and the last unsubscribe releases it", () => {
	const events: string[] = [];
	const source: { notify?: () => void } = {};
	const subscribe = createSharedSubscription((notify) => {
		events.push("start");
		source.notify = notify;
		return (): void => {
			events.push("stop");
			source.notify = undefined;
		};
	});
	const first = subscribe((): void => {
		events.push("first");
	});
	const second = subscribe((): void => {
		events.push("second");
	});
	expect(events).toEqual(["start"]);
	source.notify?.();
	first();
	source.notify?.();
	expect(events).toEqual(["start", "first", "second", "second"]);
	second();
	second();
	expect(events.at(-1)).toBe("stop");
	expect(events.filter((event) => event === "stop")).toHaveLength(1);
	expect(source.notify).toBeUndefined();
	const resumed = subscribe((): void => {
		events.push("resumed");
	});
	source.notify?.();
	expect(events.slice(-2)).toEqual(["start", "resumed"]);
	resumed();
});
