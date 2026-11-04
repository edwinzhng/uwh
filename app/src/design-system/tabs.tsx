import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import type { RoleTone } from "./role-glow";
import { ScrollArea, type ScrollAreaHandle } from "./scroll-area";
import { SelectionIndicator } from "./selection-indicator";
import { tabAppearance, useTabAppearance } from "./tab-appearance";
import { type TabSize, tabFrame, tabScrollRange } from "./tab-layout";
import { TabOption } from "./tab-option";
import { useTheme } from "./theme";
import { space } from "./tokens";
import { useControlSelection } from "./use-control-selection";

type Props<T extends string> = {
	label: string;
	page?: boolean;
	hideLabel?: boolean;
	value: T;
	options: readonly {
		value: T;
		label: string;
		isDisabled?: boolean;
		roleTone?: RoleTone;
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
	const appearance = useTabAppearance();
	const treatment = tabAppearance(appearance, theme);
	const { selectedValue, selectValue } = useControlSelection(
		value,
		onValueChange,
	);
	const scroll = useRef<ScrollAreaHandle>(null);
	const [scrollWidth, setScrollWidth] = useState(0);
	const [rowWidth, setRowWidth] = useState(0);
	const inset = treatment.inset;
	const gap = treatment.gap;
	const [sizes, setSizes] = useState<Partial<Record<T, TabSize>>>({});
	const measurements = useMemo(
		() =>
			options.map((option) => ({
				value: option.value,
				size: sizes[option.value],
			})),
		[options, sizes],
	);
	const frame = tabFrame(measurements, selectedValue, gap);
	const selectedRange = frame
		? tabScrollRange(frame, inset, space.md)
		: undefined;
	const rangeStart = selectedRange?.start;
	const rangeEnd = selectedRange?.end;
	const revealedValue = useRef(value);
	useEffect((): void => {
		if (
			rangeStart !== undefined &&
			rangeEnd !== undefined &&
			scrollWidth > 0 &&
			rowWidth > 0
		) {
			const intent = revealedValue.current === value ? "layout" : "activation";
			revealedValue.current = value;
			scroll.current?.reveal(
				{ start: rangeStart, end: rangeEnd, inset: space.md },
				intent,
			);
		}
	}, [rangeStart, rangeEnd, rowWidth, scrollWidth, value]);
	return (
		<View
			style={{
				minWidth: 0,
				maxWidth: "100%",
				alignSelf: "flex-start",
				backgroundColor: treatment.background,
				borderRadius: treatment.radius + inset,
				overflow: "hidden",
			}}
		>
			<ScrollArea
				revealRef={scroll}
				horizontal
				keyboardShouldPersistTaps="handled"
				showsHorizontalScrollIndicator={false}
				style={{ flexGrow: 0 }}
				fadeTone="secondary"
				onLayout={(event): void => {
					const next = event.nativeEvent.layout.width;
					setScrollWidth((current) => (current === next ? current : next));
				}}
				onContentSizeChange={(next): void =>
					setRowWidth((current) => (current === next ? current : next))
				}
			>
				<View
					accessibilityRole="tablist"
					accessibilityLabel={label}
					style={{ padding: inset }}
				>
					<View style={{ flexDirection: "row", gap }}>
						{frame && appearance !== "outline" ? (
							<SelectionIndicator
								frame={
									appearance === "underline"
										? {
												...frame,
												y: frame.height - space.xxs,
												height: space.xxs,
											}
										: frame
								}
								value={selectedValue}
								color={treatment.selected}
								radius={treatment.radius}
								borderColor={treatment.selectedBorder}
							/>
						) : undefined}
						{options.map((option) => (
							<View
								key={option.value}
								onLayout={(event): void => {
									const { width, height } = event.nativeEvent.layout;
									setSizes((current) => {
										const previous = current[option.value];
										return previous?.width === width &&
											previous.height === height
											? current
											: { ...current, [option.value]: { width, height } };
									});
								}}
							>
								<TabOption
									label={option.label}
									roleTone={option.roleTone}
									selected={selectedValue === option.value}
									indicatorReady={
										frame !== undefined && appearance !== "outline"
									}
									disabled={option.isDisabled}
									onPress={(): void => {
										selectValue(option.value);
									}}
									onFocus={(): void => {
										const target = tabFrame(measurements, option.value, gap);
										if (target)
											scroll.current?.reveal(
												tabScrollRange(target, inset, space.md),
											);
									}}
								/>
							</View>
						))}
					</View>
				</View>
			</ScrollArea>
		</View>
	);
};
