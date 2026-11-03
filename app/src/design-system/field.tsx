import { type ReactElement, useEffect, useId, useRef, useState } from "react";
import { Platform, TextInput, View } from "react-native";
import { IconButton } from "./icon-button";
import { Stack } from "./stack";
import { isSubmitKey } from "./submit-key";
import { Text } from "./text";
import { useTheme } from "./theme";
import { control, corners, font, geometry, typography } from "./tokens";
import { useControlSize } from "./use-control-size";

type Props = {
	label: string;
	variant?: "default" | "composer" | "score";
	hideLabel?: boolean;
	labelTone?: "primary" | "secondary";
	value: string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	hint?: string;
	error?: string;
	isDisabled?: boolean;
	multiline?: boolean;
	rows?: number;
	onSubmit?: () => void;
	testID?: string;
	secure?: boolean;
	maxLength?: number;
	focusKey?: string;
	selection?: { start: number; end: number };
	onSelectionChange?: (selection: { start: number; end: number }) => void;
	inputMode?: "text" | "email" | "decimal" | "numeric" | "search" | "tel";
	autoComplete?: "name" | "email" | "current-password" | "new-password";
};
export const Field = ({
	label,
	variant = "default",
	hideLabel = false,
	labelTone = "secondary",
	value,
	onValueChange,
	placeholder,
	hint,
	error,
	isDisabled,
	multiline = false,
	rows,
	onSubmit,
	testID,
	secure = false,
	maxLength,
	focusKey,
	selection,
	onSelectionChange,
	inputMode = "text",
	autoComplete,
}: Props): ReactElement => {
	const theme = useTheme();
	const controlSize = useControlSize();
	const id = useId();
	const [focused, setFocused] = useState(false);
	const [revealed, setRevealed] = useState(false);
	const [revealSelection, setRevealSelection] = useState<{
		start: number;
		end: number;
	}>();
	const currentSelection = useRef({ start: value.length, end: value.length });
	const input = useRef<TextInput>(null);
	useEffect((): void => {
		if (focusKey) input.current?.focus();
	}, [focusKey]);
	useEffect(() => {
		if (!revealSelection) return;
		input.current?.focus();
		const frame = requestAnimationFrame(() => setRevealSelection(undefined));
		return (): void => cancelAnimationFrame(frame);
	}, [revealSelection]);
	return (
		<Stack gap="xs">
			{!hideLabel ? (
				<Text variant="caption" tone={labelTone}>
					{label}
				</Text>
			) : undefined}
			<View>
				<TextInput
					ref={input}
					nativeID={id}
					testID={testID}
					accessibilityLabel={label}
					accessibilityHint={error ?? hint}
					accessibilityState={{ disabled: isDisabled }}
					aria-invalid={Boolean(error)}
					value={value}
					selection={selection ?? revealSelection}
					onSelectionChange={
						secure || onSelectionChange
							? (event): void => {
									currentSelection.current = event.nativeEvent.selection;
									onSelectionChange?.(event.nativeEvent.selection);
								}
							: undefined
					}
					maxLength={maxLength}
					onChangeText={onValueChange}
					placeholder={placeholder}
					editable={!isDisabled}
					multiline={multiline}
					numberOfLines={rows}
					submitBehavior={onSubmit ? "submit" : undefined}
					onSubmitEditing={onSubmit}
					onKeyPress={
						onSubmit && Platform.OS === "web"
							? (event): void => {
									if (!isSubmitKey(event.nativeEvent)) return;
									event.preventDefault();
									onSubmit();
								}
							: undefined
					}
					secureTextEntry={secure && !revealed}
					inputMode={inputMode}
					autoComplete={autoComplete}
					autoCorrect={!secure && inputMode === "text"}
					autoCapitalize={secure || inputMode !== "text" ? "none" : "sentences"}
					placeholderTextColor={theme.text.secondary}
					onFocus={(): void => setFocused(true)}
					onBlur={(): void => setFocused(false)}
					style={{
						width: "100%",
						minWidth: 0,
						minHeight: multiline
							? rows
								? Math.max(
										controlSize,
										control.typography.lineHeight * rows + control.paddingY * 2,
									)
								: geometry.control * 2
							: controlSize,
						maxHeight: multiline
							? rows
								? Math.max(
										controlSize,
										control.typography.lineHeight * rows + control.paddingY * 2,
									)
								: geometry.control * 3
							: undefined,
						borderWidth: variant === "composer" ? 0 : geometry.border,
						borderColor: focused
							? theme.focus
							: error
								? theme.danger.foreground
								: theme.controlBorder,
						borderRadius: corners.control,
						outlineWidth: focused ? geometry.focus : 0,
						outlineOffset: geometry.focus,
						outlineColor: theme.focus,
						paddingHorizontal: control.paddingX,
						paddingRight: secure
							? control.paddingX + Math.max(geometry.touch, controlSize)
							: control.paddingX,
						paddingVertical: control.paddingY,
						backgroundColor:
							variant === "composer"
								? theme.background.tertiary
								: theme.background.primary,
						color: theme.text.primary,
						fontFamily: variant === "score" ? font.heading : font.regular,
						fontSize:
							variant === "score"
								? typography.number.fontSize
								: control.typography.fontSize,
						lineHeight:
							variant === "score"
								? typography.number.lineHeight
								: control.typography.lineHeight,
						textAlign: variant === "score" ? "center" : undefined,
						textAlignVertical: multiline ? "top" : "center",
						opacity: isDisabled ? geometry.disabledOpacity : 1,
					}}
				/>
				{secure ? (
					<View
						style={{
							position: "absolute",
							top: 0,
							right: geometry.border,
							bottom: 0,
							justifyContent: "center",
						}}
					>
						<IconButton
							label={`${revealed ? "Hide" : "Show"} ${label.toLowerCase()}`}
							icon={revealed ? "eyeOff" : "eye"}
							isDisabled={isDisabled}
							onPress={(): void => {
								setRevealSelection(currentSelection.current);
								setRevealed((current) => !current);
							}}
						/>
					</View>
				) : undefined}
			</View>
			{error || hint ? (
				<Text variant="caption" tone={error ? "danger" : "secondary"}>
					{error ?? hint}
				</Text>
			) : undefined}
		</Stack>
	);
};
