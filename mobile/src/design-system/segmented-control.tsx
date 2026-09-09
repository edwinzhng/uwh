import { type ReactElement, useId, useState } from "react";
import {
	type LayoutChangeEvent,
	ScrollView,
	useWindowDimensions,
	View,
} from "react-native";
import type { IconName } from "./icon";
import { type SegmentFrame, SegmentIndicator } from "./segment-indicator";
import { SegmentOption } from "./segment-option";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { control, corners, geometry, layer, space } from "./tokens";
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
	const groupName = useId();
	const controlSize = useControlSize();
	const isRound = variant === "icons";
	const { fontScale } = useWindowDimensions();
	const height = Math.max(
		controlSize,
		control.typography.lineHeight * fontScale +
			control.paddingY * 2 +
			geometry.border * 2,
	);
	const [frames, setFrames] = useState<Partial<Record<T, SegmentFrame>>>({});
	const [hoveredValue, setHoveredValue] = useState<T>();
	const selected = options.find(
		(option) => option.value === value && !option.isDisabled,
	);
	const tabStop = selected ?? options.find((option) => !option.isDisabled);
	const frame = selected ? frames[selected.value] : undefined;
	const hovered = options.find(
		(option) =>
			option.value === hoveredValue &&
			!option.isDisabled &&
			option.value !== value,
	);
	const hoverFrame = hovered ? frames[hovered.value] : undefined;
	const measure = (optionValue: T, event: LayoutChangeEvent): void => {
		const next = event.nativeEvent.layout;
		setFrames((current) => {
			const previous = current[optionValue];
			return previous?.x === next.x &&
				previous.y === next.y &&
				previous.width === next.width &&
				previous.height === next.height
				? current
				: { ...current, [optionValue]: next };
		});
	};
	return (
		<Stack gap="xs">
			{!hideLabel ? (
				<Text variant="caption" tone="secondary">
					{label}
				</Text>
			) : undefined}
			<ScrollView
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
						gap: space.xxs,
						padding: control.segmentInset,
						borderRadius: isRound ? corners.pill : corners.panel,
						outlineWidth: isRound ? geometry.border : 0,
						outlineOffset: -geometry.border,
						outlineColor: theme.border,
						backgroundColor: theme.background.secondary,
					}}
				>
					{hoverFrame ? (
						<View
							pointerEvents="none"
							accessible={false}
							style={{
								position: "absolute",
								zIndex: layer.base,
								left: hoverFrame.x,
								top: hoverFrame.y,
								width: hoverFrame.width,
								height: hoverFrame.height,
								borderRadius: isRound ? corners.pill : corners.control,
								backgroundColor: theme.background.hover,
							}}
						/>
					) : undefined}
					{frame ? (
						<SegmentIndicator frame={frame} isRound={isRound} />
					) : undefined}
					{options.map((option) => (
						<View
							key={option.value}
							style={{ zIndex: layer.selected }}
							onLayout={(event): void => measure(option.value, event)}
						>
							<SegmentOption
								label={option.label}
								icon={option.icon}
								value={option.value}
								groupName={groupName}
								isSelected={selected?.value === option.value}
								isDisabled={option.isDisabled}
								isTabStop={tabStop?.value === option.value}
								showSelection={selected?.value === option.value && !frame}
								height={height - control.segmentInset * 2}
								onHoverChange={(isHovered): void =>
									setHoveredValue((current) =>
										isHovered
											? option.value
											: current === option.value
												? undefined
												: current,
									)
								}
								onSelect={(): void => {
									if (!option.isDisabled && option.value !== value)
										onValueChange(option.value);
								}}
							/>
						</View>
					))}
				</View>
			</ScrollView>
		</Stack>
	);
};
