export type RichMarks = { bold: boolean; italic: boolean };
export type RichRun = RichMarks & { text: string };
export type RichBlock = {
	kind: "paragraph" | "bullet" | "numbered";
	runs: RichRun[];
};
export type RichDocument = { blocks: RichBlock[] };

export const plainRichMarks: RichMarks = { bold: false, italic: false };
export const richRun = (
	text: string,
	marks: RichMarks = plainRichMarks,
): RichRun => ({ text, bold: marks.bold, italic: marks.italic });

const sameMarks = (left: RichMarks, right: RichMarks): boolean =>
	left.bold === right.bold && left.italic === right.italic;

export const normalizeRichRuns = (runs: readonly RichRun[]): RichRun[] => {
	const result: RichRun[] = [];
	for (const entry of runs) {
		if (!entry.text) continue;
		const last = result.at(-1);
		if (last && sameMarks(last, entry)) last.text += entry.text;
		else result.push({ ...entry });
	}
	return result;
};

const closingMarker = (text: string, marker: string, start: number): number => {
	const cursor = { index: start };
	while (cursor.index < text.length) {
		if (text.at(cursor.index) === "\\") cursor.index += 2;
		else if (text.startsWith(marker, cursor.index)) return cursor.index;
		else cursor.index += 1;
	}
	return -1;
};

const parseRuns = (
	text: string,
	marks: RichMarks = plainRichMarks,
): RichRun[] => {
	const cursor = { index: 0 };
	const result: RichRun[] = [];
	while (cursor.index < text.length) {
		const current = text.at(cursor.index) ?? "";
		if (current === "\\" && /[\\*.\-•]/.test(text.at(cursor.index + 1) ?? "")) {
			result.push(richRun(text.at(cursor.index + 1) ?? "", marks));
			cursor.index += 2;
			continue;
		}
		const marker = ["***", "**", "*"].find((candidate) =>
			text.startsWith(candidate, cursor.index),
		);
		const end = marker
			? closingMarker(text, marker, cursor.index + marker.length)
			: -1;
		if (marker && end > cursor.index + marker.length) {
			result.push(
				...parseRuns(text.slice(cursor.index + marker.length, end), {
					bold: marks.bold || marker.length > 1,
					italic: marks.italic || marker.length !== 2,
				}),
			);
			cursor.index = end + marker.length;
		} else {
			result.push(richRun(current, marks));
			cursor.index += 1;
		}
	}
	return normalizeRichRuns(result);
};

export const parseRichMessage = (markdown: string): RichDocument => ({
	blocks: markdown
		.replaceAll("\r\n", "\n")
		.split("\n")
		.map((line) => {
			const list = /^\s*(?:([-•])|(\d+)\.)\s+(.*)$/.exec(line);
			return {
				kind: list?.at(1) ? "bullet" : list?.at(2) ? "numbered" : "paragraph",
				runs: parseRuns(list?.at(3) ?? line),
			};
		}),
});

export const richBlockText = (block: RichBlock): string =>
	block.runs.map((entry) => entry.text).join("");
export const richPlainText = (document: RichDocument): string =>
	document.blocks.map(richBlockText).join("\n");
