import { useEffect, useRef, useState } from "react";
import type { MessageFormat, TextSelection } from "./formatted-text-model";
import type { RichMessageEditorProps } from "./rich-message-editor-props";
import {
	commitRichHistory,
	initialRichHistory,
	redoRichHistory,
	undoRichHistory,
} from "./rich-message-history";
import {
	acceptsRichSource,
	applyNativeRichChange,
	formatRichMessage,
	initialRichEditor,
	projectRichMessage,
	type RichDocument,
	type RichEditorState,
	replaceRichText,
	richSourceError,
	selectRichText,
	serializeRichMessage,
} from "./rich-message-model";

export const useRichMessageEditor = (
	props: RichMessageEditorProps,
): {
	state: RichEditorState;
	focusRevision: number;
	current: () => RichEditorState;
	select: (selection: TextSelection) => void;
	replace: (text: string) => boolean;
	format: (format: MessageFormat) => boolean;
	nativeChange: (text: string) => void;
	documentChange: (document: RichDocument, selection: TextSelection) => boolean;
	apply: (next: RichEditorState) => boolean;
	undo: () => void;
	redo: () => void;
} => {
	const [state, setState] = useState(() => initialRichEditor(props.value));
	const [focusRevision, setFocusRevision] = useState(0);
	const history = useRef(initialRichHistory(state));
	const options = useRef(props);
	options.current = props;
	const emitted = useRef(props.value);
	const lastReset = useRef(props.resetKey);
	const appliedFormat = useRef<string | undefined>(undefined);
	const appliedInsert = useRef<string | undefined>(undefined);
	const publish = (next: RichEditorState, native = false): boolean => {
		const value = serializeRichMessage(next.document);
		const limit = options.current.maxLength ?? 5000;
		if (!acceptsRichSource(emitted.current, value, limit, native)) {
			options.current.onError?.(richSourceError(value, limit));
			return false;
		}
		history.current = commitRichHistory(history.current, next);
		setState(next);
		emitted.current = value;
		options.current.onValueChange(value);
		options.current.onError?.(richSourceError(value, limit));
		return true;
	};
	const publishRef = useRef(publish);
	publishRef.current = publish;
	useEffect(() => {
		if (props.value === emitted.current && props.resetKey === lastReset.current)
			return;
		const next = initialRichEditor(props.value);
		emitted.current = props.value;
		lastReset.current = props.resetKey;
		history.current = initialRichHistory(next);
		setState(next);
		props.onError?.(richSourceError(props.value, props.maxLength));
	}, [props.value, props.resetKey, props.maxLength, props.onError]);
	useEffect(() => {
		const request = props.insertRequest;
		if (!request || appliedInsert.current === request.id || props.isDisabled)
			return;
		appliedInsert.current = request.id;
		if (
			publishRef.current(replaceRichText(history.current.present, request.text))
		)
			setFocusRevision((previous) => previous + 1);
	}, [props.insertRequest, props.isDisabled]);

	useEffect(() => {
		const request = props.formatRequest;
		if (!request || appliedFormat.current === request.id) return;
		appliedFormat.current = request.id;
		if (props.isDisabled) return;
		if (
			publishRef.current(
				formatRichMessage(history.current.present, request.format),
			)
		)
			setFocusRevision((current) => current + 1);
	}, [props.formatRequest, props.isDisabled]);
	const moveHistory = (direction: "undo" | "redo"): void => {
		if (options.current.isDisabled) return;
		history.current =
			direction === "undo"
				? undoRichHistory(history.current)
				: redoRichHistory(history.current);
		const next = history.current.present;
		emitted.current = serializeRichMessage(next.document);
		options.current.onValueChange(emitted.current);
		options.current.onError?.(
			richSourceError(emitted.current, options.current.maxLength),
		);
		setState(next);
	};
	return {
		state,
		focusRevision,
		current: (): RichEditorState => history.current.present,
		select: (selection): void => {
			if (
				selection.start === history.current.present.selection.start &&
				selection.end === history.current.present.selection.end
			)
				return;
			const next = selectRichText(history.current.present, selection);
			history.current = { ...history.current, present: next };
			setState(next);
		},
		replace: (text): boolean =>
			!options.current.isDisabled &&
			publish(replaceRichText(history.current.present, text)),
		format: (format): boolean =>
			!options.current.isDisabled &&
			publish(formatRichMessage(history.current.present, format)),
		nativeChange: (text): void => {
			if (
				options.current.isDisabled ||
				text === projectRichMessage(history.current.present.document).text
			)
				return;
			publish(applyNativeRichChange(history.current.present, text), true);
		},
		documentChange: (document, selection): boolean =>
			!options.current.isDisabled &&
			publish(
				selectRichText({ ...history.current.present, document }, selection),
			),
		apply: (next): boolean => !options.current.isDisabled && publish(next),
		undo: (): void => moveHistory("undo"),
		redo: (): void => moveHistory("redo"),
	};
};
