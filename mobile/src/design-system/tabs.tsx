import { type ReactElement, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { type SegmentFrame, SegmentIndicator } from "./segment-indicator";
import { TabOption } from "./tab-option";
import { useTheme } from "./theme";
import { geometry, space } from "./tokens";

type Props<T extends string> = {
	label: string;
	page?: boolean;
	hideLabel?: boolean;
	value: T;
	options: readonly {
		value: T;
		label: string;
		staffRole?: "coach" | "admin";
		isDisabled?: boolean;
	}[];
	onValueChange: (value: T) => void;
};
export const Tabs = <T extends string>({
	label,
	page = false,
	value,
	options,
	onValueChange,
}: Props<T>): ReactElement => {
	const theme = useTheme();
	const { width } = useWindowDimensions();
	const [contentWidth, setContentWidth] = useState(0);
	const viewportWidth =
		width - (width >= geometry.wide ? geometry.popupWidth : 0);
	const inset =
		page && contentWidth ? Math.max(0, (viewportWidth - contentWidth) / 2) : 0;
	const [frames, setFrames] = useState<Partial<Record<T, SegmentFrame>>>({});
	const frame = frames[value];
	return (
		<View
			onLayout={(event): void =>
				setContentWidth(event.nativeEvent.layout.width)
			}
		>
			<View
				pointerEvents="none"
				style={{
					position: "absolute",
					bottom: 0,
					left: -inset,
					right: -inset,
					height: geometry.border,
					backgroundColor: theme.border,
				}}
			/>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				style={{ flexGrow: 0 }}
			>
				<View
					accessibilityRole="tablist"
					accessibilityLabel={label}
					style={{
						flexDirection: "row",
						gap: space.md,
					}}
				>
					{options.map((option) => (
						<View
							key={option.value}
							onLayout={(event): void => {
								const next = event.nativeEvent.layout;
								setFrames((current) => {
									const previous = current[option.value];
									return previous?.x === next.x &&
										previous.width === next.width &&
										previous.height === next.height
										? current
										: { ...current, [option.value]: next };
								});
							}}
						>
							<TabOption
								label={option.label}
								staffRole={option.staffRole}
								selected={value === option.value}
								disabled={option.isDisabled}
								onPress={(): void => onValueChange(option.value)}
							/>
						</View>
					))}
					{frame ? (
						<SegmentIndicator
							appearance="underline"
							frame={{ ...frame, y: frame.height - 2, height: 2 }}
						/>
					) : undefined}
				</View>
			</ScrollView>
		</View>
	);
};
