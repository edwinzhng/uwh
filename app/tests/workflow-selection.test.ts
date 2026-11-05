import { expect, test } from "bun:test";
import { verifyWorkflow } from "../scripts/workflow-model";
import {
	initialSelection,
	type SelectionState,
	selectionState,
} from "../src/design-system/selection-state";

type Value = "overview" | "people" | "coaching";
type Action =
	| { type: "select"; value: Value }
	| { type: "ack"; coalesce: boolean }
	| { type: "navigate"; value: Value };
type Model = {
	actual: SelectionState<Value>;
	writes: readonly Value[];
	expected: Value;
	scope: string;
};
const values: readonly Value[] = ["overview", "people", "coaching"];
test("bounded selection model keeps body and control together through rapid input, delayed/coalesced URL writes and external navigation", (): void => {
	const result = verifyWorkflow<Model, Action>({
		initial: {
			actual: initialSelection<Value>("overview", "event-a"),
			writes: [],
			expected: "overview",
			scope: "event-a",
		},
		depth: 9,
		key: JSON.stringify,
		actions: (state) => [
			...values.map((value): Action => ({ type: "select", value })),
			...(state.writes.length
				? [
						{ type: "ack", coalesce: false } satisfies Action,
						{ type: "ack", coalesce: true } satisfies Action,
					]
				: []),
			...values.map((value): Action => ({ type: "navigate", value })),
		],
		transition: (state, action): Model => {
			if (action.type === "select")
				return action.value === state.expected
					? state
					: {
							...state,
							actual: selectionState(state.actual, action),
							writes: [...state.writes, action.value],
							expected: action.value,
						};
			if (action.type === "navigate") {
				const scope = state.scope === "event-a" ? "event-b" : "event-a";
				return {
					actual: selectionState(state.actual, {
						type: "observe",
						value: action.value,
						scope,
						pending: false,
					}),
					writes: [],
					expected: action.value,
					scope,
				};
			}
			const acknowledged = action.coalesce
				? state.writes.at(-1)
				: state.writes.at(0);
			if (!acknowledged) throw new Error("No pending route");
			const writes = action.coalesce ? [] : state.writes.slice(1);
			return {
				...state,
				actual: selectionState(state.actual, {
					type: "observe",
					value: acknowledged,
					scope: state.scope,
					pending: writes.length > 0,
				}),
				writes,
				expected: writes.at(-1) ?? acknowledged,
			};
		},
		invariant: (_before, _action, after): void => {
			expect(after.actual.selected).toBe(after.expected);
			expect(after.actual.scope).toBe(after.scope);
		},
	});
	expect(result.transitions).toBeGreaterThan(10000);
});
