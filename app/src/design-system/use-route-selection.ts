import { useLayoutEffect, useReducer, useTransition } from "react";
import { initialSelection, selectionState } from "./selection-state";

export const useRouteSelection = <T extends string>(
	value: T,
	writeRoute: (next: T) => void,
	scope = "",
): { value: T; select: (next: T) => void } => {
	const [state, dispatch] = useReducer(
		selectionState<T>,
		initialSelection(value, scope),
	);
	const [pending, startTransition] = useTransition();
	useLayoutEffect(
		(): void => dispatch({ type: "observe", value, scope, pending }),
		[value, scope, pending],
	);
	return {
		value: state.selected,
		select: (next): void => {
			if (next === state.selected) return;
			dispatch({ type: "select", value: next });
			startTransition((): void => writeRoute(next));
		},
	};
};
