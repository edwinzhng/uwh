import emojiRegex from "emoji-regex";
import {
	normalizeRichRuns,
	parseRichMessage,
	plainRichMarks as plainMarks,
	type RichBlock,
	type RichDocument,
	type RichMarks,
	richBlockText,
	richPlainText,
	richRun as run,
} from "../shared/rich-message-parser";
import type { MessageFormat, TextSelection } from "./formatted-text-model";

export {
	normalizeRichRuns,
	parseRichMessage,
	type RichBlock,
	type RichDocument,
	type RichMarks,
	type RichRun,
	richBlockText,
	richPlainText,
} from "../shared/rich-message-parser";

export type RichEditorState = {
	document: RichDocument;
	selection: TextSelection;
	typing: RichMarks;
};
export type RichFormatRequest = { id: string; format: MessageFormat };
export type RichProjection = {
	text: string;
	positions: number[];
	starts: number[];
	prefixes: { start: number; end: number; block: number }[];
};

const escapeMarkdown = (text: string): string =>
	text.replace(/\\/g, "\\\\").replace(/\*/g, "\\*");

export const serializeRichMessage = (document: RichDocument): string => {
	const numbering = { next: 0 };
	return document.blocks
		.map((block) => {
			numbering.next = block.kind === "numbered" ? numbering.next + 1 : 0;
			const content = normalizeRichRuns(block.runs)
				.map((entry) => {
					const marker = entry.bold
						? entry.italic
							? "***"
							: "**"
						: entry.italic
							? "*"
							: "";
					return `${marker}${escapeMarkdown(entry.text)}${marker}`;
				})
				.join("");
			if (!richBlockText(block)) return "";
			if (block.kind === "bullet") return `- ${content}`;
			if (block.kind === "numbered") return `${numbering.next}. ${content}`;
			return content
				.replace(/^(\s*)([-•])(\s)/, "$1\\$2$3")
				.replace(/^(\s*\d+)\.(\s)/, "$1\\.$2");
		})
		.join("\n");
};

export const fallbackRichBoundaries = (text: string): number[] => {
	const emoji = Array.from(text.matchAll(emojiRegex())).map((match) => ({
		start: match.index,
		end: match.index + (match.at(0)?.length ?? 0),
	}));
	const boundaries = [0];
	const cursor = { offset: 0 };
	for (const character of Array.from(text)) {
		if (boundaries.length > 1 && /\p{Mark}|[\uFE0E\uFE0F]/u.test(character))
			boundaries.pop();
		cursor.offset += character.length;
		boundaries.push(cursor.offset);
	}
	return boundaries.filter(
		(position) =>
			!emoji.some((entry) => position > entry.start && position < entry.end),
	);
};

const graphemeBoundaries = (text: string): number[] => {
	if (typeof Intl.Segmenter === "function")
		return [
			...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
				text,
			),
		]
			.map((entry) => entry.index)
			.concat(text.length);
	return fallbackRichBoundaries(text);
};

export const richSourceError = (
	source: string,
	limit = 5000,
): string | undefined =>
	source.length > limit
		? `Use ${limit.toLocaleString("en-CA")} characters or fewer`
		: undefined;

export const acceptsRichSource = (
	previous: string,
	next: string,
	limit = 5000,
	preserveNativeDraft = false,
): boolean =>
	preserveNativeDraft || next.length <= limit || next.length < previous.length;
export const richSelection = (
	text: string,
	selection: TextSelection,
): TextSelection => {
	const start = Math.max(
		0,
		Math.min(selection.start, selection.end, text.length),
	);
	const end = Math.max(
		start,
		Math.min(Math.max(selection.start, selection.end), text.length),
	);
	const boundaries = graphemeBoundaries(text);
	const first = boundaries.reduce(
		(previous, boundary) => (boundary <= start ? boundary : previous),
		0,
	);
	return {
		start: first,
		end:
			start === end
				? first
				: (boundaries.find((boundary) => boundary >= end) ?? text.length),
	};
};

type RichAtom = RichMarks & {
	text: string;
	kind: RichBlock["kind"];
	nextKind?: RichBlock["kind"];
};
const richAtoms = (document: RichDocument): RichAtom[] =>
	document.blocks.flatMap((block, index) => [
		...block.runs.flatMap((entry) =>
			Array.from(entry.text).map((text) => ({
				...entry,
				text,
				kind: block.kind,
			})),
		),
		...(index < document.blocks.length - 1
			? [
					{
						...plainMarks,
						text: "\n",
						kind: block.kind,
						nextKind: document.blocks.at(index + 1)?.kind,
					},
				]
			: []),
	]);

const fromAtoms = (
	atoms: RichAtom[],
	kind: RichBlock["kind"],
): RichDocument => {
	const blocks: RichBlock[] = [{ kind, runs: [] }];
	for (const atom of atoms) {
		if (atom.text === "\n")
			blocks.push({ kind: atom.nextKind ?? atom.kind, runs: [] });
		else {
			const block = blocks.at(-1);
			if (block) block.runs.push(run(atom.text, atom));
		}
	}
	return {
		blocks: blocks.map((block) => ({
			...block,
			runs: normalizeRichRuns(block.runs),
		})),
	};
};

const blockAt = (
	document: RichDocument,
	position: number,
): { block: RichBlock; index: number; start: number } => {
	const cursor = { start: 0 };
	const index = document.blocks.findIndex((block) => {
		const end = cursor.start + richBlockText(block).length;
		if (position <= end) return true;
		cursor.start = end + 1;
		return false;
	});
	return {
		block: document.blocks.at(index) ?? { kind: "paragraph", runs: [] },
		index,
		start: cursor.start,
	};
};

export const richTypingMarks = (
	document: RichDocument,
	selection: TextSelection,
): RichMarks => {
	const caret = Math.max(
		0,
		selection.start - (selection.start === selection.end ? 1 : 0),
	);
	const cursor = { offset: 0 };
	const atom = richAtoms(document).find((atom) => {
		cursor.offset += atom.text.length;
		return cursor.offset > caret;
	});
	return atom ? { bold: atom.bold, italic: atom.italic } : plainMarks;
};

export const initialRichEditor = (markdown: string): RichEditorState => {
	const document = parseRichMessage(markdown);
	const end = richPlainText(document).length;
	const selection = { start: end, end };
	return { document, selection, typing: richTypingMarks(document, selection) };
};

export const selectRichText = (
	state: RichEditorState,
	selection: TextSelection,
): RichEditorState => {
	const next = richSelection(richPlainText(state.document), selection);
	return {
		...state,
		selection: next,
		typing: richTypingMarks(state.document, next),
	};
};

export const formatRichMessage = (
	state: RichEditorState,
	format: MessageFormat,
): RichEditorState => {
	const selection = richSelection(
		richPlainText(state.document),
		state.selection,
	);
	if (format === "bullet" || format === "numbered") {
		const first = blockAt(state.document, selection.start).index;
		const last = blockAt(
			state.document,
			selection.end > selection.start ? selection.end - 1 : selection.end,
		).index;
		const remove = state.document.blocks
			.slice(first, last + 1)
			.every((block) => block.kind === format);
		return {
			...state,
			selection,
			document: {
				blocks: state.document.blocks.map((block, index) =>
					index >= first && index <= last
						? { ...block, kind: remove ? "paragraph" : format }
						: block,
				),
			},
		};
	}
	if (selection.start === selection.end)
		return {
			...state,
			selection,
			typing: { ...state.typing, [format]: !state.typing[format] },
		};
	const cursor = { offset: 0 };
	const selected = richAtoms(state.document).filter((atom) => {
		const start = cursor.offset;
		cursor.offset += atom.text.length;
		return (
			start < selection.end &&
			cursor.offset > selection.start &&
			atom.text !== "\n"
		);
	});
	const enabled = !selected.every((atom) => atom[format]);
	const position = { offset: 0 };
	const atoms = richAtoms(state.document).map((atom) => {
		const start = position.offset;
		position.offset += atom.text.length;
		return start >= selection.start &&
			position.offset <= selection.end &&
			atom.text !== "\n"
			? { ...atom, [format]: enabled }
			: atom;
	});
	return {
		...state,
		selection,
		typing: { ...state.typing, [format]: enabled },
		document: fromAtoms(
			atoms,
			state.document.blocks.at(0)?.kind ?? "paragraph",
		),
	};
};

export const replaceRichText = (
	state: RichEditorState,
	value: string,
): RichEditorState => {
	const text = richPlainText(state.document);
	const selection = richSelection(text, state.selection);
	const current = blockAt(state.document, selection.start);
	if (
		value === "\n" &&
		selection.start === selection.end &&
		current.block.kind !== "paragraph" &&
		!richBlockText(current.block)
	)
		return {
			...state,
			document: {
				blocks: state.document.blocks.map((block, index) =>
					index === current.index ? { ...block, kind: "paragraph" } : block,
				),
			},
		};
	const position = { offset: 0 };
	const atoms = richAtoms(state.document).map((atom) => {
		const start = position.offset;
		position.offset += atom.text.length;
		return { atom, start, end: position.offset };
	});
	const incoming = value.replaceAll("\r\n", "\n");
	const inserted = Array.from(incoming).map(
		(character): RichAtom => ({
			text: character,
			...state.typing,
			kind: current.block.kind,
			nextKind: current.block.kind,
		}),
	);
	const document = fromAtoms(
		[
			...atoms
				.filter((entry) => entry.end <= selection.start)
				.map((entry) => entry.atom),
			...inserted,
			...atoms
				.filter((entry) => entry.start >= selection.end)
				.map((entry) => entry.atom),
		],
		state.document.blocks.at(0)?.kind ?? "paragraph",
	);
	const end = selection.start + incoming.length;
	return { ...state, document, selection: { start: end, end } };
};

export const unlistRichBlock = (state: RichEditorState): RichEditorState => {
	const current = blockAt(state.document, state.selection.start);
	return {
		...state,
		document: {
			blocks: state.document.blocks.map((block, index) =>
				index === current.index ? { ...block, kind: "paragraph" } : block,
			),
		},
	};
};
export const atRichListStart = (state: RichEditorState): boolean => {
	const current = blockAt(state.document, state.selection.start);
	return (
		state.selection.start === state.selection.end &&
		current.block.kind !== "paragraph" &&
		state.selection.start === current.start
	);
};

export const projectRichMessage = (document: RichDocument): RichProjection => {
	const result: RichProjection = {
		text: "",
		positions: [0],
		starts: [],
		prefixes: [],
	};
	const cursor = { model: 0, number: 0 };
	for (const [index, block] of document.blocks.entries()) {
		if (index > 0) {
			result.text += "\n";
			cursor.model += 1;
			result.positions.push(cursor.model);
		}
		cursor.number = block.kind === "numbered" ? cursor.number + 1 : 0;
		const prefix =
			block.kind === "bullet"
				? "• "
				: block.kind === "numbered"
					? `${cursor.number}. `
					: "";
		const start = result.text.length;
		result.text += prefix;
		result.positions.push(
			...Array.from({ length: prefix.length }, () => cursor.model),
		);
		if (prefix)
			result.prefixes.push({ start, end: result.text.length, block: index });
		result.starts.push(result.text.length);
		for (const character of richBlockText(block).split("")) {
			result.text += character;
			cursor.model += 1;
			result.positions.push(cursor.model);
		}
	}
	return result;
};
export const projectedRichSelection = (
	document: RichDocument,
	selection: TextSelection,
): TextSelection => {
	const projection = projectRichMessage(document);
	const start = Math.max(0, projection.positions.lastIndexOf(selection.start));
	const end = Math.max(start, projection.positions.lastIndexOf(selection.end));
	return { start, end };
};

export const applyNativeRichChange = (
	state: RichEditorState,
	next: string,
): RichEditorState => {
	const projection = projectRichMessage(state.document);
	const selected = projectedRichSelection(state.document, state.selection);
	const insertedLength =
		next.length - projection.text.length + selected.end - selected.start;
	if (
		insertedLength >= 0 &&
		next.slice(0, selected.start) ===
			projection.text.slice(0, selected.start) &&
		next.slice(selected.start + insertedLength) ===
			projection.text.slice(selected.end)
	)
		return replaceRichText(
			state,
			next.slice(selected.start, selected.start + insertedLength),
		);
	const cursor = { prefix: 0, suffix: 0 };
	while (
		cursor.prefix < Math.min(projection.text.length, next.length) &&
		projection.text.at(cursor.prefix) === next.at(cursor.prefix)
	)
		cursor.prefix += 1;
	while (
		cursor.suffix <
			Math.min(
				projection.text.length - cursor.prefix,
				next.length - cursor.prefix,
			) &&
		projection.text.at(projection.text.length - 1 - cursor.suffix) ===
			next.at(next.length - 1 - cursor.suffix)
	)
		cursor.suffix += 1;
	cursor.prefix = Math.min(
		richSelection(projection.text, { start: cursor.prefix, end: cursor.prefix })
			.start,
		richSelection(next, { start: cursor.prefix, end: cursor.prefix }).start,
	);
	const oldEnd = richSelection(projection.text, {
		start: cursor.prefix,
		end: projection.text.length - cursor.suffix,
	}).end;
	const nextEnd = richSelection(next, {
		start: cursor.prefix,
		end: next.length - cursor.suffix,
	}).end;
	const prefix = projection.prefixes.find(
		(entry) =>
			cursor.prefix >= entry.start &&
			cursor.prefix < entry.end &&
			oldEnd <= entry.end,
	);
	const target = {
		...state,
		selection: {
			start: projection.positions.at(cursor.prefix) ?? 0,
			end:
				projection.positions.at(oldEnd) ?? richPlainText(state.document).length,
		},
	};
	if (prefix && next.length < projection.text.length)
		return unlistRichBlock(target);
	return replaceRichText(target, next.slice(cursor.prefix, nextEnd));
};

export const richEditorHeight = (
	contentHeight: number,
	lineHeight: number,
	padding: number,
	minimum: number,
): number =>
	Math.max(
		minimum,
		Math.min(
			lineHeight * 10 + padding * 2,
			Math.max(lineHeight + padding * 2, contentHeight),
		),
	);
