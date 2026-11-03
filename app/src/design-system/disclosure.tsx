import {
	type ReactElement,
	type ReactNode,
	type Ref,
	useId,
	useState,
} from "react";
import { Pressable, View } from "react-native";
import { Icon } from "./icon";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export type DisclosureTrigger = View;

export const Disclosure = ({
	title,
	summary,
	children,
	defaultOpen = false,
	isDisabled = false,
	isOpen,
	onOpenChange,
	triggerRef,
}: {
	title: string;
	summary?: string;
	children: ReactNode;
	defaultOpen?: boolean;
	isDisabled?: boolean;
	isOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	triggerRef?: Ref<DisclosureTrigger>;
}): ReactElement => {
	const theme = useTheme();
	const id = useId();
	const [expanded, setExpanded] = useState(defaultOpen);
	const [focused, setFocused] = useState(false);
	const open = isOpen ?? expanded;
	return (
		<View>
			<Pressable
				ref={triggerRef}
				accessibilityRole="button"
				accessibilityLabel={title}
				accessibilityState={{ expanded: open, disabled: isDisabled }}
				aria-expanded={open}
				aria-controls={id}
				disabled={isDisabled}
				onFocus={(): void => setFocused(true)}
				onBlur={(): void => setFocused(false)}
				onPress={(): void => {
					setExpanded(!open);
					onOpenChange?.(!open);
				}}
				style={({ pressed }) => ({
					minHeight: geometry.touch,
					paddingVertical: space.sm,
					flexDirection: "row",
					alignItems: "center",
					gap: space.sm,
					borderRadius: corners.control,
					backgroundColor: pressed ? theme.background.pressed : "transparent",
					outlineWidth: focused ? geometry.focus : 0,
					outlineColor: theme.focus,
					outlineOffset: geometry.focus,
				})}
			>
				<View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
					<Text variant="label">{title}</Text>
					{summary ? (
						<Text variant="caption" tone="secondary">
							{summary}
						</Text>
					) : undefined}
				</View>
				<Icon
					name={open ? "chevronDown" : "chevron"}
					tone="secondary"
					size="sm"
				/>
			</Pressable>
			<View
				nativeID={id}
				aria-hidden={!open}
				accessibilityElementsHidden={!open}
				importantForAccessibility={open ? "auto" : "no-hide-descendants"}
				style={{ display: open ? "flex" : "none", paddingBottom: space.md }}
			>
				{children}
			</View>
		</View>
	);
};
