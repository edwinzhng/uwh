import { expect, test } from "bun:test";
import {
	commitRichHistory,
	initialRichHistory,
	redoRichHistory,
	undoRichHistory,
} from "../src/design-system/rich-message-history";
import {
	formatRichMessage,
	initialRichEditor,
	replaceRichText,
	serializeRichMessage,
} from "../src/design-system/rich-message-model";

test("rich undo and redo preserve marks, selection and empty formatting state", (): void => {
	const initial = initialRichEditor("");
	const bold = formatRichMessage(initial, "bold");
	const formatted = commitRichHistory(initialRichHistory(initial), bold);
	const typed = commitRichHistory(formatted, replaceRichText(bold, "Hello😀"));
	expect(serializeRichMessage(typed.present.document)).toBe("**Hello😀**");
	expect(undoRichHistory(typed).present).toEqual(bold);
	expect(redoRichHistory(undoRichHistory(typed)).present).toEqual(
		typed.present,
	);
	expect(undoRichHistory(formatted).present).toEqual(initial);
});

test("a confirmed reset clears history and pending formatting while unchanged failed drafts retain it", (): void => {
	const draft = replaceRichText(
		formatRichMessage(initialRichEditor(""), "italic"),
		"Draft",
	);
	const history = commitRichHistory(
		initialRichHistory(initialRichEditor("")),
		draft,
	);
	expect(history.present).toEqual(draft);
	const reset = initialRichHistory(initialRichEditor(""));
	expect(undoRichHistory(reset).present).toEqual(initialRichEditor(""));
	expect(redoRichHistory(reset).present).toEqual(initialRichEditor(""));
	expect(replaceRichText(reset.present, "Next").typing).toEqual({
		bold: false,
		italic: false,
	});
});

test("rich edit history stays bounded and a new edit invalidates redo", (): void => {
	const history = Array.from({ length: 150 }, (_, index) =>
		initialRichEditor(String(index)),
	).reduce(commitRichHistory, initialRichHistory(initialRichEditor("")));
	expect(history.past).toHaveLength(100);
	const revised = commitRichHistory(
		undoRichHistory(history),
		initialRichEditor("Revision"),
	);
	expect(revised.future).toHaveLength(0);
});
