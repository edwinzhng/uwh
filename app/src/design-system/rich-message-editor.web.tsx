import {
	type ReactElement,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { pageMotionAllowed } from "./page-motion-input";
import {
	readRichDom,
	restoreRichDomSelection,
	richDomPoint,
	richDomSelection,
	writeRichDom,
} from "./rich-message-dom";
import type { RichMessageEditorProps } from "./rich-message-editor-props";
import {
	atRichListStart,
	replaceRichText,
	richPlainText,
	unlistRichBlock,
} from "./rich-message-model";
import { isSubmitKey } from "./submit-key";
import { useTheme } from "./theme";
import { control, corners, font, geometry, space } from "./tokens";
import { useRichMessageEditor } from "./use-rich-message-editor";

export const RichMessageEditor = (
	props: RichMessageEditorProps,
): ReactElement => {
	const theme = useTheme();
	const editor = useRichMessageEditor(props);
	const paddingY = props.embedded
		? (geometry.touch - control.typography.lineHeight) / 2
		: control.paddingY;
	const input = useRef<HTMLDivElement>(null);
	const composing = useRef(false);
	const rendered = useRef<string | undefined>(undefined);
	const focusRevision = useRef(editor.focusRevision);
	const [focused, setFocused] = useState(false);
	const signature = JSON.stringify(editor.state.document);
	const captureSelection = (): void => {
		const selection = input.current
			? richDomSelection(input.current)
			: undefined;
		if (selection) editor.select(selection);
	};
	const resetDom = (): void => {
		if (!input.current) return;
		writeRichDom(input.current, editor.current().document);
		rendered.current = JSON.stringify(editor.current().document);
		restoreRichDomSelection(input.current, editor.current().selection);
	};
	const readInput = (): void => {
		const element = input.current;
		if (!element || composing.current || props.isDisabled) return;
		const document = readRichDom(element);
		const selection = richDomSelection(element) ?? editor.current().selection;
		const nextSignature = JSON.stringify(document);
		if (nextSignature === rendered.current) {
			editor.select(selection);
			return;
		}
		if (editor.documentChange(document, selection))
			rendered.current = nextSignature;
		else resetDom();
	};
	useLayoutEffect(() => {
		const element = input.current;
		if (!element || composing.current) return;
		if (rendered.current !== signature) {
			writeRichDom(element, editor.state.document);
			rendered.current = signature;
			if (document.activeElement === element)
				restoreRichDomSelection(element, editor.state.selection);
		}
		if (focusRevision.current !== editor.focusRevision) {
			element.focus({ preventScroll: true });
			restoreRichDomSelection(element, editor.state.selection);
		}
		focusRevision.current = editor.focusRevision;
	}, [
		signature,
		editor.focusRevision,
		editor.state.document,
		editor.state.selection,
	]);
	useEffect(() => {
		if (props.focusKey && !props.isDisabled)
			input.current?.focus({ preventScroll: true });
	}, [props.focusKey, props.isDisabled]);
	const events = useRef({
		beforeInput: (_event: InputEvent): void => {},
		selection: (): void => {},
	});
	events.current = {
		selection: captureSelection,
		beforeInput: (event): void => {
			if (
				props.isDisabled ||
				composing.current ||
				event.isComposing ||
				!event.cancelable
			)
				return;
			captureSelection();
			const range = event.getTargetRanges?.().at(0);
			if (
				range &&
				input.current &&
				input.current.contains(range.startContainer) &&
				input.current.contains(range.endContainer)
			)
				editor.select({
					start: richDomPoint(
						input.current,
						range.startContainer,
						range.startOffset,
					),
					end: richDomPoint(input.current, range.endContainer, range.endOffset),
				});
			if (
				["insertText", "insertReplacementText"].includes(event.inputType) &&
				event.data !== null
			) {
				event.preventDefault();
				editor.replace(event.data);
			} else if (
				["insertParagraph", "insertLineBreak"].includes(event.inputType)
			) {
				event.preventDefault();
				editor.replace("\n");
			} else if (["formatBold", "formatItalic"].includes(event.inputType)) {
				event.preventDefault();
				editor.format(event.inputType === "formatBold" ? "bold" : "italic");
			} else if (["historyUndo", "historyRedo"].includes(event.inputType)) {
				event.preventDefault();
				if (event.inputType === "historyUndo") editor.undo();
				else editor.redo();
			}
		},
	};
	useEffect(() => {
		const element = input.current;
		if (!element) return;
		const beforeInput = (event: InputEvent): void =>
			events.current.beforeInput(event);
		const selection = (): void => events.current.selection();
		element.addEventListener("beforeinput", beforeInput);
		document.addEventListener("selectionchange", selection);
		return (): void => {
			element.removeEventListener("beforeinput", beforeInput);
			document.removeEventListener("selectionchange", selection);
		};
	}, []);
	return (
		<>
			<style>{`
.club-rich-message[data-empty="true"]::before {content:attr(data-placeholder);color:${theme.text.secondary};position:absolute;pointer-events:none;}
.club-rich-message strong {font-family:${font.semibold};font-weight:normal;}
.club-rich-message em {font-style:italic;}
.club-rich-message ul,.club-rich-message ol {margin:0;padding-left:${space.lg}px;}
.club-rich-message li {padding:0;margin:0;}
`}</style>
			{/* biome-ignore lint/a11y/useSemanticElements: Native form fields cannot render editable inline text styles. */}
			<div
				ref={input}
				className="club-rich-message"
				data-rich-message
				data-empty={String(
					!richPlainText(editor.state.document) &&
						editor.state.document.blocks.every(
							(block) => block.kind === "paragraph",
						),
				)}
				data-embedded={props.embedded || undefined}
				data-placeholder={props.placeholder ?? "Write a message…"}
				role="textbox"
				aria-label={props.label}
				aria-multiline="true"
				aria-disabled={props.isDisabled}
				contentEditable={!props.isDisabled}
				suppressContentEditableWarning
				tabIndex={props.isDisabled ? -1 : 0}
				spellCheck
				autoCapitalize="sentences"
				onPointerDown={(): void => {
					if (props.embedded) setFocused(false);
				}}
				onFocus={(): void =>
					setFocused(!props.embedded || !pageMotionAllowed())
				}
				onBlur={(): void => {
					captureSelection();
					setFocused(false);
				}}
				onInput={readInput}
				onCompositionStart={(): void => {
					composing.current = true;
					props.onCompositionChange?.(true);
				}}
				onCompositionEnd={(): void => {
					composing.current = false;
					props.onCompositionChange?.(false);
					readInput();
				}}
				onPaste={(event): void => {
					event.preventDefault();
					if (props.isDisabled || composing.current) return;
					captureSelection();
					editor.replace(event.clipboardData.getData("text/plain"));
				}}
				onDrop={(event): void => {
					event.preventDefault();
					if (props.isDisabled || composing.current) return;
					captureSelection();
					editor.replace(event.dataTransfer.getData("text/plain"));
				}}
				onKeyDown={(event): void => {
					if (
						props.isDisabled ||
						composing.current ||
						event.nativeEvent.isComposing ||
						event.keyCode === 229
					)
						return;
					captureSelection();
					if (
						(event.metaKey || event.ctrlKey) &&
						["b", "i", "z", "y"].includes(event.key.toLowerCase())
					) {
						event.preventDefault();
						const key = event.key.toLowerCase();
						if (key === "b" || key === "i")
							editor.format(key === "b" ? "bold" : "italic");
						else if (key === "y" || event.shiftKey) editor.redo();
						else editor.undo();
					} else if (
						event.key === "Backspace" &&
						atRichListStart(editor.current())
					) {
						event.preventDefault();
						editor.apply(unlistRichBlock(editor.current()));
					} else if (props.onSubmit && isSubmitKey(event.nativeEvent)) {
						event.preventDefault();
						props.onSubmit();
					} else if (event.key === "Enter" && event.shiftKey) {
						event.preventDefault();
						editor.apply(replaceRichText(editor.current(), "\n"));
					}
				}}
				style={{
					position: "relative",
					width: "100%",
					minWidth: 0,
					minHeight: Math.max(
						geometry.touch,
						control.typography.lineHeight * (props.rows ?? 1) + paddingY * 2,
					),
					maxHeight: control.typography.lineHeight * 10 + paddingY * 2,
					boxSizing: "border-box",
					overflowY: "auto",
					overflowX: "hidden",
					whiteSpace: "pre-wrap",
					overflowWrap: "anywhere",
					border: 0,
					borderRadius: corners.control,
					outlineWidth: focused ? geometry.focus : 0,
					outlineStyle: "solid",
					outlineOffset: geometry.focus,
					outlineColor: theme.focus,
					padding: `${paddingY}px ${control.paddingX}px`,
					backgroundColor: props.embedded
						? "transparent"
						: theme.background.tertiary,
					color: theme.text.primary,
					fontFamily: font.regular,
					fontSize: Math.max(16, control.typography.fontSize),
					lineHeight: `${control.typography.lineHeight}px`,
					opacity: props.isDisabled ? geometry.disabledOpacity : 1,
				}}
			/>
		</>
	);
};
