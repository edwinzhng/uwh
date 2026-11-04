import { type ReactElement, useId, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import type { IconName } from "./icon";
import { ScrollArea } from "./scroll-area";
import { SegmentOption } from "./segment-option";
import { SelectionIndicator } from "./selection-indicator";
import { Stack } from "./stack";
import { type TabSize, tabFrame } from "./tab-layout";
import { Text } from "./text";
import { useTheme } from "./theme";
import { control, corners, geometry, radius, space } from "./tokens";
import { useControlSelection } from "./use-control-selection";
import { useControlSize } from "./use-control-size";

type Option<T extends string> = {
	value: T;
	label: string;
	isDisabled?: boolean;
};
type Props<T extends string> = {
	label: string;
	value: T;
	hideLabel?: boolean;
	onValueChange: (value: T) => void;
} & (
	| { variant?: "labels"; options: readonly (Option<T> & { icon?: never })[] }
	| { variant: "icons"; options: readonly (Option<T> & { icon: IconName })[] }
);

export const SegmentedControl = <T extends string>({
	label,
	hideLabel = false,
	value,
	options,
	variant = "labels",
	onValueChange,
}: Props<T>): ReactElement => {
	const theme = useTheme();
	const { selectedValue, selectValue } = useControlSelection(
		value,
		onValueChange,
	);
	const [sizes, setSizes] = useState<Partial<Record<T, TabSize>>>({});
	const groupName = useId();
	const controlSize = useControlSize();
	const icons = variant === "icons";
	const { fontScale } = useWindowDimensions();
	const height = Math.max(
		(icons ? Math.max(controlSize, geometry.touch) : controlSize) +
			(icons ? control.segmentInset * 2 + geometry.border * 2 : 0),
		control.typography.lineHeight * fontScale +
			control.paddingY * 2 +
			geometry.border * 2,
	);
	const selected = options.find(
		(option) => option.value === selectedValue && !option.isDisabled,
	);
	const frame = tabFrame(
		options.map((option) => ({
			value: option.value,
			size: sizes[option.value],
		})),
		selectedValue,
		icons ? 0 : space.xxs,
	);
	const tabStop = selected ?? options.find((option) => !option.isDisabled);
	return (
		<Stack gap="xs">
			{!hideLabel ? (
				<Text variant="caption" tone="secondary">
					{label}
				</Text>
			) : undefined}
			<ScrollArea
				horizontal
				showsHorizontalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				style={{
					height,
					flexGrow: 0,
					alignSelf: "flex-start",
					maxWidth: "100%",
				}}
			>
				<View
					accessibilityRole="radiogroup"
					accessibilityLabel={label}
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: icons ? 0 : space.xxs,
						padding: icons ? control.segmentInset : 0,
						borderRadius: icons ? radius.round : corners.control,
						borderWidth: icons ? geometry.border : 0,
						borderColor: theme.border,
						backgroundColor: icons ? theme.background.secondary : "transparent",
					}}
				>
					{icons && frame ? (
						<SelectionIndicator
							frame={{
								...frame,
								x: frame.x + control.segmentInset,
								y: control.segmentInset,
							}}
							value={selectedValue}
							color={theme.background.selected}
							radius={icons ? radius.round : corners.control}
							borderColor={icons ? theme.border : undefined}
						/>
					) : undefined}
					{options.map((option) => (
						<View
							key={option.value}
							onLayout={
								icons
									? (event): void => {
											const { width, height } = event.nativeEvent.layout;
											setSizes((current) =>
												current[option.value]?.width === width &&
												current[option.value]?.height === height
													? current
													: { ...current, [option.value]: { width, height } },
											);
										}
									: undefined
							}
						>
							<SegmentOption
								key={option.value}
								label={option.label}
								icon={option.icon}
								value={option.value}
								groupName={groupName}
								isSelected={selected?.value === option.value}
								indicatorReady={icons && frame !== undefined}
								isDisabled={option.isDisabled}
								isTabStop={tabStop?.value === option.value}
								height={
									height -
									(icons ? control.segmentInset * 2 : 0) -
									(icons ? geometry.border * 2 : 0)
								}
								onSelect={(): void => {
									if (!option.isDisabled) selectValue(option.value);
								}}
							/>
						</View>
					))}
				</View>
			</ScrollArea>
		</Stack>
	);
};
