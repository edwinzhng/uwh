import type { TextSelection } from "./formatted-text-model";
import {
	normalizeRichRuns,
	type RichBlock,
	type RichDocument,
	type RichMarks,
	type RichRun,
	richBlockText,
	richPlainText,
} from "./rich-message-model";

const blockTag = (node: Node | null | undefined): boolean =>
	node instanceof HTMLElement &&
	["DIV", "P", "LI", "UL", "OL"].includes(node.tagName);
const inlineRuns = (node: Node, marks: RichMarks): RichRun[] => {
	if (node.nodeType === Node.TEXT_NODE)
		return [
			{ text: (node.textContent ?? "").replaceAll("\u00a0", " "), ...marks },
		];
	if (!(node instanceof Element) && !(node instanceof DocumentFragment))
		return [];
	if (
		node instanceof Element &&
		[
			"SCRIPT",
			"STYLE",
			"TEMPLATE",
			"IFRAME",
			"OBJECT",
			"EMBED",
			"IMG",
			"SVG",
		].includes(node.tagName)
	)
		return [];
	if (node instanceof Element && node.tagName === "BR")
		return node.parentNode?.childNodes.length === 1
			? []
			: [{ text: "\n", ...marks }];
	const next = {
		bold:
			marks.bold ||
			(node instanceof Element && ["B", "STRONG"].includes(node.tagName)),
		italic:
			marks.italic ||
			(node instanceof Element && ["I", "EM"].includes(node.tagName)),
	};
	return Array.from(node.childNodes).flatMap((child, index) => [
		...(index > 0 && blockTag(child) ? [{ text: "\n", ...next }] : []),
		...inlineRuns(child, next),
	]);
};

const splitDomRuns = (
	kind: RichBlock["kind"],
	runs: RichRun[],
): RichBlock[] => {
	const blocks: RichBlock[] = [{ kind, runs: [] }];
	for (const entry of runs) {
		for (const [index, text] of entry.text.split("\n").entries()) {
			if (index > 0) blocks.push({ kind, runs: [] });
			if (text) blocks.at(-1)?.runs.push({ ...entry, text });
		}
	}
	return blocks.map((block) => ({
		...block,
		runs: normalizeRichRuns(block.runs),
	}));
};

export const readRichDom = (
	root: HTMLElement | DocumentFragment,
): RichDocument => {
	const blocks: RichBlock[] = [];
	const inline: RichRun[] = [];
	const flush = (): void => {
		if (!inline.length) return;
		blocks.push(...splitDomRuns("paragraph", inline));
		inline.splice(0);
	};
	for (const node of Array.from(root.childNodes)) {
		if (node instanceof HTMLElement && ["UL", "OL"].includes(node.tagName)) {
			flush();
			for (const child of Array.from(node.children))
				blocks.push(
					...splitDomRuns(
						node.tagName === "UL" ? "bullet" : "numbered",
						inlineRuns(child, { bold: false, italic: false }),
					),
				);
		} else if (
			node instanceof HTMLElement &&
			["DIV", "P", "LI"].includes(node.tagName)
		) {
			flush();
			blocks.push(
				...splitDomRuns(
					"paragraph",
					inlineRuns(node, { bold: false, italic: false }),
				),
			);
		} else inline.push(...inlineRuns(node, { bold: false, italic: false }));
	}
	flush();
	return { blocks: blocks.length ? blocks : [{ kind: "paragraph", runs: [] }] };
};

export const richDomPoint = (
	root: HTMLElement,
	node: Node,
	offset: number,
): number => {
	if (!root.contains(node)) return 0;
	const range = document.createRange();
	range.selectNodeContents(root);
	range.setEnd(node, offset);
	const text = richPlainText(readRichDom(range.cloneContents()));
	return (
		text.length +
		(offset > 0 &&
		offset < node.childNodes.length &&
		blockTag(node.childNodes.item(offset))
			? 1
			: 0)
	);
};
export const richDomSelection = (
	root: HTMLElement,
): TextSelection | undefined => {
	const selection = window.getSelection();
	if (
		!selection?.anchorNode ||
		!selection.focusNode ||
		!root.contains(selection.anchorNode) ||
		!root.contains(selection.focusNode)
	)
		return undefined;
	const anchor = richDomPoint(
		root,
		selection.anchorNode,
		selection.anchorOffset,
	);
	const focus = richDomPoint(root, selection.focusNode, selection.focusOffset);
	return { start: Math.min(anchor, focus), end: Math.max(anchor, focus) };
};

export const writeRichDom = (root: HTMLElement, value: RichDocument): void => {
	const fragment = document.createDocumentFragment();
	const list: { element?: HTMLElement; kind?: RichBlock["kind"] } = {};
	for (const [index, block] of value.blocks.entries()) {
		const element = document.createElement(
			block.kind === "paragraph" ? "div" : "li",
		);
		element.dataset.richBlock = String(index);
		for (const entry of block.runs) {
			const text = document.createTextNode(entry.text);
			const bold = entry.bold ? document.createElement("strong") : undefined;
			const italic = entry.italic ? document.createElement("em") : undefined;
			if (bold) bold.append(text);
			if (italic) italic.append(bold ?? text);
			element.append(italic ?? bold ?? text);
		}
		if (!richBlockText(block)) element.append(document.createElement("br"));
		if (block.kind === "paragraph") {
			fragment.append(element);
			list.element = undefined;
			list.kind = undefined;
		} else {
			if (list.kind !== block.kind || !list.element) {
				list.element = document.createElement(
					block.kind === "bullet" ? "ul" : "ol",
				);
				list.kind = block.kind;
				fragment.append(list.element);
			}
			list.element.append(element);
		}
	}
	root.replaceChildren(fragment);
	root.dataset.empty = String(
		!richPlainText(value) &&
			value.blocks.every((block) => block.kind === "paragraph"),
	);
};

const findRichDomPoint = (
	root: HTMLElement,
	position: number,
): { node: Node; offset: number } => {
	const cursor = { start: 0 };
	const blocks = Array.from(
		root.querySelectorAll<HTMLElement>("[data-rich-block]"),
	);
	for (const [index, block] of blocks.entries()) {
		const length = block.textContent?.length ?? 0;
		if (position <= cursor.start + length || index === blocks.length - 1) {
			const remaining = {
				value: Math.max(0, Math.min(position - cursor.start, length)),
			};
			const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
			const current: { node: Node | null } = { node: walker.nextNode() };
			while (current.node) {
				const size = current.node.textContent?.length ?? 0;
				if (remaining.value <= size)
					return { node: current.node, offset: remaining.value };
				remaining.value -= size;
				current.node = walker.nextNode();
			}
			return { node: block, offset: 0 };
		}
		cursor.start += length + 1;
	}
	return { node: root, offset: 0 };
};
export const restoreRichDomSelection = (
	root: HTMLElement,
	selection: TextSelection,
): void => {
	const start = findRichDomPoint(root, selection.start);
	const end = findRichDomPoint(root, selection.end);
	const range = document.createRange();
	range.setStart(start.node, start.offset);
	range.setEnd(end.node, end.offset);
	const current = window.getSelection();
	current?.removeAllRanges();
	current?.addRange(range);
};
