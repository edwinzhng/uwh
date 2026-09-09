import { type ReactElement, useState } from "react";
import { TextInput, View } from "react-native";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { matchesQuery } from "./matches-query";
import type { PickerProps } from "./picker-props";
import { PickerTrigger } from "./picker-trigger";
import { PopupRow } from "./popup-row";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { control, corners, font, geometry } from "./tokens";

export const NativePicker = <T extends string>({
	label,
	value,
	options,
	onValueChange,
	placeholder = "Select…",
	isDisabled,
	searchable = false,
	hideLabel = false,
	compact = false,
}: PickerProps<T> & { searchable?: boolean }): ReactElement => {
	const theme = useTheme();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const selected = options.find((option) => option.value === value);
	const visible = options.filter(
		(option) => !searchable || matchesQuery(option.label, query),
	);
	const changeOpen = (next: boolean): void => {
		setOpen(next);
		setQuery("");
	};
	return (
		<Stack gap="xs">
			{!hideLabel ? (
				<Text variant="caption" tone="secondary">
					{label}
				</Text>
			) : undefined}
			<PickerTrigger
				label={label}
				compact={compact}
				value={selected?.label ?? placeholder}
				isOpen={open}
				isDisabled={isDisabled}
				tone={selected?.tone}
				onPress={(): void => changeOpen(true)}
			/>
			<Dialog title={label} isOpen={open} onOpenChange={changeOpen}>
				{searchable ? (
					<TextInput
						autoFocus
						accessibilityLabel={`Search ${label.toLowerCase()}`}
						placeholder="Search…"
						placeholderTextColor={theme.text.secondary}
						value={query}
						onChangeText={setQuery}
						autoCorrect={false}
						style={{
							minHeight: geometry.touch,
							borderWidth: geometry.border,
							borderColor: theme.controlBorder,
							borderRadius: corners.control,
							paddingHorizontal: control.paddingX,
							paddingVertical: control.paddingY,
							color: theme.text.primary,
							fontFamily: font.regular,
							fontSize: control.typography.fontSize,
							lineHeight: control.typography.lineHeight,
						}}
					/>
				) : undefined}
				{searchable && selected ? (
					<Button
						label="Clear selection"
						variant="ghost"
						onPress={(): void => {
							onValueChange(undefined);
							changeOpen(false);
						}}
					/>
				) : undefined}
				<View accessibilityRole="radiogroup" accessibilityLabel={label}>
					{visible.map((option) => (
						<PopupRow
							key={option.value}
							label={option.label}
							icon={option.icon}
							isSelected={value === option.value}
							isDisabled={option.isDisabled}
							tone={option.tone}
							onSelect={(): void => {
								if (!option.isDisabled) {
									onValueChange(option.value);
									changeOpen(false);
								}
							}}
						/>
					))}
					{visible.length === 0 ? (
						<Text variant="small" tone="secondary">
							{searchable ? "No results" : "No options"}
						</Text>
					) : undefined}
				</View>
			</Dialog>
		</Stack>
	);
};
