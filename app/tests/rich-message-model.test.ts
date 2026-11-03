import { describe, expect, test } from "bun:test";
import {
	acceptsRichSource,
	applyNativeRichChange,
	atRichListStart,
	fallbackRichBoundaries,
	formatRichMessage,
	initialRichEditor,
	normalizeRichRuns,
	parseRichMessage,
	projectedRichSelection,
	projectRichMessage,
	replaceRichText,
	richEditorHeight,
	richPlainText,
	richSelection,
	richSourceError,
	selectRichText,
	serializeRichMessage,
	unlistRichBlock,
} from "../src/design-system/rich-message-model";

describe("structural rich messages", () => {
	test("Markdown parses into actual marked runs and safely round-trips literal punctuation", (): void => {
		const source =
			"**bold** *italic* ***both***\n- One\n- Two\n1. First\n2. Next\nLiteral \\* and C:\\news";
		const document = parseRichMessage(source);
		expect(richPlainText(document)).toBe(
			"bold italic both\nOne\nTwo\nFirst\nNext\nLiteral * and C:\\news",
		);
		expect(
			document.blocks
				.at(0)
				?.runs.filter((entry) => entry.bold && entry.italic)
				.map((entry) => entry.text),
		).toEqual(["both"]);
		expect(parseRichMessage(serializeRichMessage(document))).toEqual(document);
		const literal = replaceRichText(
			initialRichEditor(""),
			"**literal**\n- not a list\n1. not numbered",
		);
		expect(parseRichMessage(serializeRichMessage(literal.document))).toEqual(
			literal.document,
		);
	});

	test("collapsed formatting changes typing marks without inserting placeholder text or markers", (): void => {
		const bold = formatRichMessage(initialRichEditor(""), "bold");
		expect(serializeRichMessage(bold.document)).toBe("");
		const typed = replaceRichText(bold, "Hello");
		expect(richPlainText(typed.document)).toBe("Hello");
		expect(serializeRichMessage(typed.document)).toBe("**Hello**");
		const both = replaceRichText(formatRichMessage(typed, "italic"), " world");
		expect(both.document.blocks.at(0)?.runs.at(-1)).toEqual({
			text: " world",
			bold: true,
			italic: true,
		});
		const normal = replaceRichText(
			formatRichMessage(formatRichMessage(both, "bold"), "italic"),
			"!",
		);
		expect(normal.document.blocks.at(0)?.runs.at(-1)).toEqual({
			text: "!",
			bold: false,
			italic: false,
		});
	});

	test("selected formatting toggles without duplicating, losing or exposing source markers", (): void => {
		const selected = selectRichText(initialRichEditor("Hello world"), {
			start: 0,
			end: 5,
		});
		const marked = formatRichMessage(selected, "bold");
		expect(serializeRichMessage(marked.document)).toBe("**Hello** world");
		expect(marked.selection).toEqual({ start: 0, end: 5 });
		expect(
			serializeRichMessage(formatRichMessage(marked, "bold").document),
		).toBe("Hello world");
	});

	test("list continuation, empty-item exit and start-of-list backspace preserve the text", (): void => {
		const list = formatRichMessage(initialRichEditor("One"), "bullet");
		const next = replaceRichText(list, "\n");
		expect(next.document.blocks.map((block) => block.kind)).toEqual([
			"bullet",
			"bullet",
		]);
		expect(projectRichMessage(next.document).text).toBe("• One\n• ");
		const exited = replaceRichText(next, "\n");
		expect(exited.document.blocks.map((block) => block.kind)).toEqual([
			"bullet",
			"paragraph",
		]);
		const start = selectRichText(list, { start: 0, end: 0 });
		expect(atRichListStart(start)).toBe(true);
		expect(serializeRichMessage(unlistRichBlock(start).document)).toBe("One");
		expect(
			applyNativeRichChange(start, "•One").document.blocks.at(0)?.kind,
		).toBe("paragraph");
	});

	test("native list projections map visible prefixes to model selections and renumber consecutive items", (): void => {
		const document = parseRichMessage("1. First\n2. Second\n\n1. Again");
		const projection = projectRichMessage(document);
		expect(projection.text).toBe("1. First\n2. Second\n\n1. Again");
		expect(projectedRichSelection(document, { start: 6, end: 12 })).toEqual({
			start: 12,
			end: 18,
		});
		expect(projection.positions.at(12)).toBe(6);
	});

	test("native edits use the actual selection in repeated text rather than shifting formatting to the end", (): void => {
		const state = formatRichMessage(
			selectRichText(initialRichEditor("aaaa"), { start: 1, end: 1 }),
			"bold",
		);
		const inserted = applyNativeRichChange(state, "aaaaa");
		expect(serializeRichMessage(inserted.document)).toBe("a**a**aaa");
		expect(inserted.selection).toEqual({ start: 2, end: 2 });
	});

	test("emoji, combining marks, replacement and multiline paste use UTF-16 selections without splitting graphemes", (): void => {
		const family = "👨‍👩‍👧‍👦";
		expect(richSelection(family, { start: 2, end: 2 })).toEqual({
			start: 0,
			end: 0,
		});
		expect(richSelection("e\u0301", { start: 0, end: 1 })).toEqual({
			start: 0,
			end: 2,
		});
		const changed = applyNativeRichChange(
			selectRichText(initialRichEditor("😀"), { start: 2, end: 2 }),
			"😁",
		);
		expect(richPlainText(changed.document)).toBe("😁");
		const pasted = replaceRichText(initialRichEditor(""), "Hi😀\r\nNext");
		expect(richPlainText(pasted.document)).toBe("Hi😀\nNext");
		expect(pasted.selection).toEqual({ start: 9, end: 9 });
	});

	test("empty transient lists serialize as empty so formatting alone never makes a sendable message", (): void => {
		const state = formatRichMessage(initialRichEditor(""), "numbered");
		expect(serializeRichMessage(state.document)).toBe("");
		expect(projectRichMessage(state.document).text).toBe("1. ");
	});

	test("physical content measurements include soft wrapping and cap the editor at ten lines", (): void => {
		expect(richEditorHeight(22, 22, 6, 44)).toBe(44);
		expect(richEditorHeight(80, 22, 6, 44)).toBe(80);
		expect(richEditorHeight(600, 22, 6, 44)).toBe(232);
	});
	test("all adjacent mark combinations round-trip without changing text or style", (): void => {
		const marks = [
			{ bold: false, italic: false },
			{ bold: true, italic: false },
			{ bold: false, italic: true },
			{ bold: true, italic: true },
		];
		for (const first of marks)
			for (const second of marks)
				for (const third of marks) {
					const document = {
						blocks: [
							{
								kind: "paragraph",
								runs: normalizeRichRuns([
									{ text: "A", ...first },
									{ text: "B", ...second },
									{ text: "C", ...third },
								]),
							},
						],
					} satisfies Parameters<typeof serializeRichMessage>[0];
					expect(parseRichMessage(serializeRichMessage(document))).toEqual(
						document,
					);
				}
	});
	test("emoji and combining sequences remain whole without Intl.Segmenter", (): void => {
		expect(fallbackRichBoundaries("👨‍👩‍👧‍👦")).toEqual([0, 11]);
		expect(fallbackRichBoundaries("e\u0301")).toEqual([0, 2]);
		expect(fallbackRichBoundaries("👍🏽🇨🇦")).toEqual([0, 4, 8]);
	});
	test("source limits count Markdown, reject growth, permit correction and preserve native composition drafts", (): void => {
		const previous = "x".repeat(5000);
		const formatted = serializeRichMessage(
			formatRichMessage(
				selectRichText(initialRichEditor(previous), { start: 0, end: 5000 }),
				"bold",
			).document,
		);
		expect(acceptsRichSource("", previous)).toBe(true);
		expect(acceptsRichSource(previous, formatted)).toBe(false);
		expect(acceptsRichSource(previous, formatted, 5000, true)).toBe(true);
		expect(richSourceError(formatted)).toBe("Use 5,000 characters or fewer");
		expect(acceptsRichSource(formatted, "x".repeat(5001))).toBe(true);
		expect(richSourceError(previous)).toBeUndefined();
	});
});
