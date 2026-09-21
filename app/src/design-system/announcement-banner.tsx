import { type ReactElement, useState } from "react";
import { Pressable, View } from "react-native";
import { Icon } from "./icon";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const AnnouncementBanner = ({
	message,
	onDismiss,
	isDismissing = false,
}: {
	message: string;
	onDismiss: () => void;
	isDismissing?: boolean;
}): ReactElement => {
	const theme = useTheme();
	const [focused, setFocused] = useState(false);
	return (
		<View
			accessibilityRole="summary"
			style={{
				flexDirection: "row",
				alignItems: "flex-start",
				gap: space.sm,
				padding: space.md,
				backgroundColor: theme.brand.background,
				borderRadius: corners.panel,
			}}
		>
			<View style={{ paddingTop: space.half }}>
				<Icon name="megaphone" tone="onBrand" />
			</View>
			<View style={{ flex: 1 }}>
				<Text tone="onBrand">{message}</Text>
			</View>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Dismiss announcement"
				accessibilityState={{ disabled: isDismissing }}
				disabled={isDismissing}
				onPress={onDismiss}
				onFocus={(): void => setFocused(true)}
				onBlur={(): void => setFocused(false)}
				style={({ pressed }) => ({
					width: geometry.touch,
					height: geometry.touch,
					marginTop: -space.sm,
					marginRight: -space.sm,
					alignItems: "center",
					justifyContent: "center",
					opacity: pressed || isDismissing ? 0.65 : 1,
					borderRadius: corners.control,
					outlineWidth: focused ? geometry.focus : 0,
					outlineColor: theme.brand.foreground,
				})}
			>
				<Icon name="close" tone="onBrand" />
			</Pressable>
		</View>
	);
};
