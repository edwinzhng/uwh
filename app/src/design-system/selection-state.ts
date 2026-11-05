export type SelectionState<T extends string> = {
	scope: string;
	observed: T;
	selected: T;
};
export type SelectionAction<T extends string> =
	| { type: "select"; value: T }
	| { type: "observe"; value: T; scope: string; pending: boolean };
export const initialSelection = <T extends string>(
	value: T,
	scope = "",
): SelectionState<T> => ({ scope, observed: value, selected: value });
export const selectionState = <T extends string>(
	state: SelectionState<T>,
	action: SelectionAction<T>,
): SelectionState<T> => {
	if (action.type === "select")
		return action.value === state.selected
			? state
			: { ...state, selected: action.value };
	if (action.scope !== state.scope)
		return initialSelection(action.value, action.scope);
	const selected = action.pending ? state.selected : action.value;
	return state.observed === action.value && state.selected === selected
		? state
		: { ...state, observed: action.value, selected };
};
