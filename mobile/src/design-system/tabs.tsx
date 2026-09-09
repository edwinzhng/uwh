import { type ReactElement, useState } from "react";
import { ScrollView, View } from "react-native";
import { type SegmentFrame, SegmentIndicator } from "./segment-indicator";
import { TabOption } from "./tab-option";
import { useTheme } from "./theme";
import { geometry, space } from "./tokens";

type Props<T extends string> = {
	label: string;
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
	value,
	options,
	onValueChange,
}: Props<T>): ReactElement => {
	const theme = useTheme();
	const [frames, setFrames] = useState<Partial<Record<T, SegmentFrame>>>({});
	const frame = frames[value];
	return (
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
					borderBottomWidth: geometry.border,
					borderBottomColor: theme.border,
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
	);
};
