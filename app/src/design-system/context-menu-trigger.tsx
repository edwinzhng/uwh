import type { ReactElement } from "react";
import { Pressable, View } from "react-native";
import type { ContextMenuTriggerProps } from "./context-menu-trigger-props";
import { Icon } from "./icon";
import { useTheme } from "./theme";
import { corners, geometry } from "./tokens";

export const ContextMenuTrigger = ({
	label,
	isOpen,
	isFocused,
	isDisabled,
	onOpen,
	onFocusChange,
}: ContextMenuTriggerProps): ReactElement => {
	const theme = useTheme();
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled: isDisabled, expanded: isOpen }}
			accessibilityActions={[{ name: "activate", label }]}
			onAccessibilityAction={(): void => {
				if (!isDisabled) onOpen();
			}}
			focusable={!isDisabled}
			disabled={isDisabled}
			pointerEvents={isFocused ? "auto" : "none"}
			onPress={onOpen}
			onFocus={(): void => onFocusChange(true)}
			onBlur={(): void => onFocusChange(false)}
			style={{
				width: geometry.touch,
				height: geometry.touch,
				alignItems: "center",
				justifyContent: "center",
				borderRadius: corners.control,
				outlineWidth: isFocused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: -geometry.focus,
			}}
		>
			<View style={{ opacity: isFocused ? 1 : 0 }}>
				<Icon name="more" size="sm" tone="secondary" />
			</View>
		</Pressable>
	);
};
