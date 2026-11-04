import { expect, test } from "bun:test";
import { createPageReadiness } from "../src/design-system/page-readiness";

const events = [
	"loading",
	"loaded",
	"query",
	"resolved",
	"frame",
	"layout",
	"route",
] as const;
type Event = (typeof events)[number];
const sequences = Array.from({ length: 5 }).reduce<Event[][]>(
	(prefixes) =>
		prefixes.flatMap((prefix) => events.map((event) => [...prefix, event])),
	[[]],
);

test("all 16,807 five-step loading, layout and navigation interleavings preserve readiness and cancel abandoned work", (): void => {
	for (const sequence of sequences) {
		const callbacks = new Map<number, () => void>();
		const state = {
			id: 0,
			loading: false,
			query: false,
			key: "a",
			ready: false,
		};
		const controller = createPageReadiness({
			onChange: (ready): void => {
				if (ready) expect(state.loading).toBe(false);
				state.ready = ready;
			},
			scheduleFrame: (callback): (() => void) => {
				const id = ++state.id;
				callbacks.set(id, callback);
				return (): void => {
					callbacks.delete(id);
				};
			},
		});
		const frame = (): void => {
			const pending = [...callbacks.values()];
			callbacks.clear();
			for (const callback of pending) callback();
		};
		controller.update(false, false, state.key);
		for (const event of sequence) {
			if (event === "frame") frame();
			else if (event === "layout") controller.layout();
			else {
				if (event === "loading" || event === "loaded")
					state.loading = event === "loading";
				if (event === "query" || event === "resolved")
					state.query = event === "query";
				if (event === "route") state.key = state.key === "a" ? "b" : "a";
				controller.update(state.loading, state.query, state.key);
				if (event === "route") expect(state.ready).toBe(false);
			}
			if (state.loading) expect(state.ready).toBe(false);
		}
		state.loading = false;
		state.query = false;
		controller.update(false, false, state.key);
		frame();
		frame();
		expect(state.ready).toBe(true);
		controller.update(false, false, `${state.key}:abandoned`);
		controller.dispose();
		frame();
		frame();
		expect(state.ready).toBe(false);
		expect(callbacks.size).toBe(0);
	}
});
