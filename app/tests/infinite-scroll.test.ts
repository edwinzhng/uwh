import { expect, test } from "bun:test";
import { createInfiniteRequestGate } from "../src/design-system/infinite-request-gate";

test("repeated visibility checks and callback replacements request only one page", (): void => {
	const gate = createInfiniteRequestGate();
	const calls: string[] = [];
	const props = {
		revision: 30,
		loadMore: (): void => {
			calls.push("page");
		},
	};
	gate.update(props);
	gate.request(props);
	gate.request({
		...props,
		loadMore: (): void => {
			calls.push("duplicate");
		},
	});
	expect(calls).toEqual(["page"]);
	gate.update({ ...props, revision: 60 });
	gate.request({ ...props, revision: 60 });
	expect(calls).toEqual(["page", "page"]);
});

test("loading, exhausted lists, disabled forms, and stale callbacks cannot fetch", (): void => {
	const gate = createInfiniteRequestGate();
	const calls: number[] = [];
	const props = {
		revision: "filter-a:30",
		loadMore: (): void => {
			calls.push(1);
		},
	};
	gate.update(props);
	gate.request({ ...props, loading: true });
	gate.request({ ...props, disabled: true });
	gate.request({ ...props, loadMore: undefined });
	gate.request({ ...props, revision: "filter-b:30" });
	expect(calls).toEqual([]);
	gate.request(props);
	expect(calls).toEqual([1]);
});

test("a completed empty page can continue without changing the row count", (): void => {
	const gate = createInfiniteRequestGate();
	const calls: number[] = [];
	const props = {
		revision: 30,
		loading: false,
		loadMore: (): void => {
			calls.push(1);
		},
	};
	gate.update(props);
	gate.request(props);
	gate.update({ ...props, loading: true });
	gate.request({ ...props, loading: true });
	gate.update(props);
	gate.request(props);
	expect(calls).toEqual([1, 1]);
});
