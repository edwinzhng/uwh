import { type ReactElement, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useButtonHaptics } from "./haptics";
import { Icon } from "./icon";
import type { MessageReactionProps } from "./message-reaction-props";
import { ReactionOverlay } from "./reaction-overlay";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const MessageReactionTrigger = ({
	outgoing,
	isOpen,
	isDisabled,
	onPress,
	onShowActions,
	mode,
	error,
	recent,
	selected,
	onClose,
	onAll,
	onSelect,
}: MessageReactionProps): ReactElement => {
	const theme = useTheme();
	const anchor = useRef<View>(null);
	const haptic = useButtonHaptics();
	const [focused, setFocused] = useState(false);
	return (
		<>
			<View ref={anchor} collapsable={false}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Add reaction"
					accessibilityState={{ disabled: isDisabled, expanded: isOpen }}
					accessibilityActions={[
						{ name: "activate", label: "Add reaction" },
						{ name: "showMenu", label: "Message actions" },
					]}
					onAccessibilityAction={({ nativeEvent }): void => {
						if (isDisabled) return;
						if (nativeEvent.actionName === "showMenu") onShowActions();
						else if (nativeEvent.actionName === "activate") onPress();
					}}
					disabled={isDisabled}
					onPress={(): void => {
						onPress();
						haptic();
					}}
					onLongPress={onShowActions}
					onFocus={(): void => setFocused(true)}
					onBlur={(): void => setFocused(false)}
					style={({ pressed }) => ({
						width: geometry.touch,
						height: geometry.touch,
						alignItems: outgoing ? "flex-end" : "flex-start",
						justifyContent: "center",
						opacity: isDisabled ? geometry.disabledOpacity : 1,
						borderRadius: corners.item,
						outlineWidth: focused ? geometry.focus : 0,
						outlineColor: theme.focus,
						outlineOffset: -geometry.focus,
						backgroundColor: pressed ? theme.background.hover : "transparent",
					})}
				>
					<View
						style={{
							width: space.lg + geometry.focus * 2,
							height: space.lg + geometry.focus * 2,
							alignItems: "center",
							justifyContent: "center",
							borderRadius: corners.pill,
							borderWidth: geometry.border,
							borderColor: theme.border,
							backgroundColor: theme.background.primary,
						}}
					>
						<Icon name="reaction" size="sm" tone="secondary" />
					</View>
				</Pressable>
			</View>
			<ReactionOverlay
				anchor={anchor}
				isOpen={isOpen}
				mode={mode}
				error={error}
				recent={recent}
				selected={selected}
				isDisabled={isDisabled}
				onClose={onClose}
				onAll={onAll}
				onSelect={onSelect}
			/>
		</>
	);
};
