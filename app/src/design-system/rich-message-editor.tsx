import {
	type ReactElement,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { Text, TextInput, useWindowDimensions } from "react-native";
import type { TextSelection } from "./formatted-text-model";
import type { RichMessageEditorProps } from "./rich-message-editor-props";
import {
	projectedRichSelection,
	projectRichMessage,
	richEditorHeight,
	serializeRichMessage,
} from "./rich-message-model";
import { useTheme } from "./theme";
import { control, corners, font, geometry, space } from "./tokens";
import { useControlSize } from "./use-control-size";
import { useRichMessageEditor } from "./use-rich-message-editor";

export const RichMessageEditor = (
	props: RichMessageEditorProps,
): ReactElement => {
	const theme = useTheme();
	const editor = useRichMessageEditor(props);
	const input = useRef<TextInput>(null);
	const { fontScale } = useWindowDimensions();
	const minimum = Math.max(geometry.touch, useControlSize());
	const paddingY = props.embedded
		? Math.max(
				space.xxs,
				(minimum - control.typography.lineHeight * fontScale) / 2,
			)
		: control.paddingY;
	const [contentHeight, setContentHeight] = useState(minimum);
	const [focused, setFocused] = useState(false);
	const [forcedSelection, setForcedSelection] = useState<TextSelection>();
	const projection = projectRichMessage(editor.state.document);
	const position = { value: 0 };
	const blocks = editor.state.document.blocks.map((block) => {
		const start = position.value;
		const runs = block.runs.map((entry) => {
			const offset = position.value;
			position.value += entry.text.length;
			return { ...entry, offset };
		});
		position.value += 1;
		return { ...block, start, runs };
	});
	const nativeText = useRef(projection.text);
	const focusedRevision = useRef(editor.focusRevision);
	const height = richEditorHeight(
		contentHeight,
		control.typography.lineHeight * fontScale,
		paddingY,
		Math.max(
			minimum,
			control.typography.lineHeight * fontScale * (props.rows ?? 1) +
				paddingY * 2,
		),
	);
	useLayoutEffect(() => {
		if (
			projection.text !== nativeText.current ||
			focusedRevision.current !== editor.focusRevision
		) {
			nativeText.current = projection.text;
			setForcedSelection(
				projectedRichSelection(editor.state.document, editor.state.selection),
			);
		}
		if (focusedRevision.current !== editor.focusRevision)
			input.current?.focus();
		focusedRevision.current = editor.focusRevision;
	}, [
		projection.text,
		editor.focusRevision,
		editor.state.document,
		editor.state.selection,
	]);
	useEffect(() => {
		if (props.focusKey && !props.isDisabled) input.current?.focus();
	}, [props.focusKey, props.isDisabled]);
	useEffect(() => {
		if (!forcedSelection) return;
		const frame = requestAnimationFrame(() => setForcedSelection(undefined));
		return (): void => cancelAnimationFrame(frame);
	}, [forcedSelection]);
	const remaining = Math.max(
		0,
		(props.maxLength ?? 5000) -
			serializeRichMessage(editor.state.document).length,
	);
	return (
		<TextInput
			ref={input}
			accessibilityLabel={props.label}
			accessibilityState={{ disabled: props.isDisabled }}
			multiline
			submitBehavior="newline"
			textAlignVertical={props.embedded ? "center" : "top"}
			editable={!props.isDisabled}
			placeholder={props.placeholder ?? "Write a message…"}
			placeholderTextColor={theme.text.secondary}
			selectionColor={theme.focus}
			keyboardAppearance={theme.mode}
			maxLength={projection.text.length + remaining}
			selection={forcedSelection}
			scrollEnabled={contentHeight > height}
			onFocus={(): void => {
				setFocused(true);
				props.onFocus?.();
			}}
			onBlur={(): void => setFocused(false)}
			onChangeText={(text): void => {
				nativeText.current = text;
				editor.nativeChange(text);
			}}
			onSelectionChange={({ nativeEvent: { selection } }): void => {
				if (
					forcedSelection &&
					(forcedSelection.start !== selection.start ||
						forcedSelection.end !== selection.end)
				)
					return;
				const currentProjection = projectRichMessage(editor.current().document);
				if (nativeText.current !== currentProjection.text) return;
				setForcedSelection(undefined);
				editor.select({
					start: currentProjection.positions.at(selection.start) ?? 0,
					end: currentProjection.positions.at(selection.end) ?? 0,
				});
			}}
			onContentSizeChange={({ nativeEvent: { contentSize } }): void => {
				setContentHeight((previous) =>
					previous === contentSize.height ? previous : contentSize.height,
				);
			}}
			style={{
				width: "100%",
				minWidth: 0,
				height,
				minHeight: minimum,
				borderWidth: 0,
				borderRadius: corners.control,
				outlineWidth: focused && !props.embedded ? geometry.focus : 0,
				outlineOffset: geometry.focus,
				outlineColor: theme.focus,
				paddingHorizontal: control.paddingX,
				paddingVertical: paddingY,
				backgroundColor: props.embedded
					? "transparent"
					: theme.background.tertiary,
				color: theme.text.primary,
				fontFamily: font.regular,
				fontSize: control.typography.fontSize,
				lineHeight: control.typography.lineHeight,
				opacity: props.isDisabled ? geometry.disabledOpacity : 1,
			}}
		>
			<Text>
				{blocks.map((block, index) => {
					const prefix = projection.prefixes.find(
						(entry) => entry.block === index,
					);
					return (
						<Text key={block.start}>
							{index > 0 ? "\n" : ""}
							{prefix ? projection.text.slice(prefix.start, prefix.end) : ""}
							{block.runs.map((entry) => (
								<Text
									key={entry.offset}
									style={{
										fontFamily: entry.bold ? font.semibold : font.regular,
										fontStyle: entry.italic ? "italic" : "normal",
									}}
								>
									{entry.text}
								</Text>
							))}
						</Text>
					);
				})}
			</Text>
		</TextInput>
	);
};
