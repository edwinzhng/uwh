import { type ReactElement, useState } from "react";
import { View } from "react-native";
import { NativeMenuView } from "./native-menu";
import { NativeMenuTrigger } from "./native-menu-trigger";
import { NativePicker } from "./native-picker";
import { usePickerSizing } from "./picker-layout-context";
import type { PickerProps } from "./picker-props";
import { Text } from "./text";
import { space } from "./tokens";

export const Select = <T extends string>(
	props: PickerProps<T>,
): ReactElement => {
	const inDialog = usePickerSizing();
	const [availableWidth, setAvailableWidth] = useState<number>();
	if (!NativeMenuView || props.listFooter) return <NativePicker {...props} />;
	const {
		label,
		value,
		options,
		onValueChange,
		placeholder = "Select…",
		isDisabled,
		hideLabel = false,
		compact,
		appearance,
	} = props;
	const menuReady = !inDialog || compact || (availableWidth ?? 0) > 0;
	const selected = options.find((option) => option.value === value);
	const trigger = (
		<NativeMenuTrigger
			appearance={appearance}
			kind="field"
			availableWidth={availableWidth}
			label={selected?.label ?? placeholder}
			accessibilityLabel={`${label}, ${selected?.label ?? placeholder}`}
			compact={compact}
			isDisabled={isDisabled}
			tone={selected?.tone}
		/>
	);
	return (
		<View
			onLayout={(event): void => {
				if (inDialog && !compact)
					setAvailableWidth(event.nativeEvent.layout.width);
			}}
			style={{ gap: space.xs, minWidth: 0 }}
		>
			{!hideLabel ? (
				<Text variant="caption" tone="secondary">
					{label}
				</Text>
			) : undefined}
			{isDisabled || !menuReady ? (
				trigger
			) : (
				<NativeMenuView
					title={label}
					actions={options.map((option) => ({
						id: option.value,
						title: option.label,
						state: option.value === value ? "on" : "off",
						attributes: { disabled: option.isDisabled },
					}))}
					onPressAction={({ nativeEvent }): void => {
						const option = options.find(
							(entry) => entry.value === nativeEvent.event,
						);
						if (option && !option.isDisabled) onValueChange(option.value);
					}}
				>
					{trigger}
				</NativeMenuView>
			)}
		</View>
	);
};
