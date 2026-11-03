import { parseRichMessage } from "../shared/rich-message-parser";

export type TextSelection = { start: number; end: number };
export type MessageFormat = "bold" | "italic" | "bullet" | "numbered";
export type FormattedRun = {
	text: string;
	offset: number;
	bold?: boolean;
	italic?: boolean;
};
export type FormattedLine = {
	prefix: string;
	runs: FormattedRun[];
	index: number;
};
export const formattedText = (body: string): FormattedLine[] => {
	const number = { value: 0 };
	const sourceLines = body.split("\n");
	return parseRichMessage(body).blocks.map((block, index) => {
		number.value = block.kind === "numbered" ? number.value + 1 : 0;
		const offset = { value: 0 };
		return {
			index,
			prefix:
				block.kind === "bullet"
					? "• "
					: block.kind === "numbered"
						? `${/^\s*(\d+)\./.exec(sourceLines.at(index) ?? "")?.at(1) ?? number.value}. `
						: "",
			runs: block.runs.length
				? block.runs.map((run) => {
						const value = { ...run, offset: offset.value };
						offset.value += run.text.length;
						return value;
					})
				: [{ text: " ", offset: 0 }],
		};
	});
};
export const formattedTextPreview = (body: string): string =>
	formattedText(body)
		.map((line) => `${line.prefix}${line.runs.map((run) => run.text).join("")}`)
		.join(" ")
		.trim();

export const formatMessageDraft = (
	body: string,
	selection: TextSelection,
	format: MessageFormat,
): { body: string; selection: TextSelection } => {
	const start = Math.max(0, Math.min(selection.start, body.length));
	const end = Math.max(start, Math.min(selection.end, body.length));
	const selected = body.slice(start, end);
	if (format === "bold" || format === "italic") {
		const marker = format === "bold" ? "**" : "*";
		const text = selected || (format === "bold" ? "bold text" : "italic text");
		return {
			body: `${body.slice(0, start)}${marker}${text}${marker}${body.slice(end)}`,
			selection: {
				start: start + marker.length,
				end: start + marker.length + text.length,
			},
		};
	}
	const lineStart = start === 0 ? 0 : body.lastIndexOf("\n", start - 1) + 1;
	const selectionEnd = end > start && body.at(end - 1) === "\n" ? end - 1 : end;
	const newline = body.indexOf("\n", selectionEnd);
	const lineEnd = newline < 0 ? body.length : newline;
	const lines = body.slice(lineStart, lineEnd).split("\n");
	const replacement = lines
		.map(
			(line, index) =>
				`${format === "bullet" ? "•" : `${index + 1}.`} ${line.replace(/^\s*(?:[-•]|\d+\.)\s+/, "") || "List item"}`,
		)
		.join("\n");
	return {
		body: `${body.slice(0, lineStart)}${replacement}${body.slice(lineEnd)}`,
		selection: { start: lineStart, end: lineStart + replacement.length },
	};
};
