import type { RichEditorState } from "./rich-message-model";

export type RichHistory = {
	past: RichEditorState[];
	present: RichEditorState;
	future: RichEditorState[];
};
export const initialRichHistory = (present: RichEditorState): RichHistory => ({
	past: [],
	present,
	future: [],
});
export const commitRichHistory = (
	history: RichHistory,
	present: RichEditorState,
): RichHistory => ({
	past: [...history.past, history.present].slice(-100),
	present,
	future: [],
});
export const undoRichHistory = (history: RichHistory): RichHistory => {
	const present = history.past.at(-1);
	return present
		? {
				past: history.past.slice(0, -1),
				present,
				future: [history.present, ...history.future],
			}
		: history;
};
export const redoRichHistory = (history: RichHistory): RichHistory => {
	const present = history.future.at(0);
	return present
		? {
				past: [...history.past, history.present],
				present,
				future: history.future.slice(1),
			}
		: history;
};
