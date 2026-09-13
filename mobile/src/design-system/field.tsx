import { type ReactElement, useEffect, useId, useRef, useState } from "react";
import { Platform, TextInput } from "react-native";
import { Stack } from "./stack";
import { isSubmitKey } from "./submit-key";
import { Text } from "./text";
import { useTheme } from "./theme";
import { control, corners, font, geometry } from "./tokens";
import { useControlSize } from "./use-control-size";

type Props = {
	label: string;
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
	inputMode?: "text" | "email" | "decimal" | "numeric" | "search";
	autoComplete?: "name" | "email" | "current-password" | "new-password";
};
export const Field = ({
	label,
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
	inputMode = "text",
	autoComplete,
}: Props): ReactElement => {
	const theme = useTheme();
	const controlSize = useControlSize();
	const id = useId();
	const [focused, setFocused] = useState(false);
	const input = useRef<TextInput>(null);
	useEffect((): void => {
		if (focusKey) input.current?.focus();
	}, [focusKey]);
	return (
		<Stack gap="xs">
			<Text variant="caption" tone={labelTone}>
				{label}
			</Text>
			<TextInput
				ref={input}
				nativeID={id}
				testID={testID}
				accessibilityLabel={label}
				accessibilityHint={error ?? hint}
				accessibilityState={{ disabled: isDisabled }}
				aria-invalid={Boolean(error)}
				value={value}
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
				secureTextEntry={secure}
				inputMode={inputMode}
				autoComplete={autoComplete}
				autoCorrect={!secure && inputMode === "text"}
				autoCapitalize={secure || inputMode !== "text" ? "none" : "sentences"}
				placeholderTextColor={theme.text.secondary}
				onFocus={(): void => setFocused(true)}
				onBlur={(): void => setFocused(false)}
				style={{
					minHeight: multiline
						? rows
							? control.typography.lineHeight * rows + control.paddingY * 2
							: geometry.control * 2
						: controlSize,
					maxHeight: multiline
						? rows
							? control.typography.lineHeight * rows + control.paddingY * 2
							: geometry.control * 3
						: undefined,
					borderWidth: geometry.border,
					borderColor: focused
						? theme.focus
						: error
							? theme.danger.foreground
							: theme.border,
					borderRadius: corners.control,
					outlineWidth: focused ? geometry.focus : 0,
					outlineOffset: geometry.focus,
					outlineColor: theme.focus,
					paddingHorizontal: control.paddingX,
					paddingVertical: control.paddingY,
					backgroundColor: theme.background.primary,
					color: theme.text.primary,
					fontFamily: font.regular,
					fontSize: control.typography.fontSize,
					lineHeight: control.typography.lineHeight,
					textAlignVertical: multiline ? "top" : "center",
					opacity: isDisabled ? geometry.disabledOpacity : 1,
				}}
			/>
			{error || hint ? (
				<Text variant="caption" tone={error ? "danger" : "secondary"}>
					{error ?? hint}
				</Text>
			) : undefined}
		</Stack>
	);
};
