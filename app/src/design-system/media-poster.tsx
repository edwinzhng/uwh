import { type ReactElement, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const MediaPoster = ({
	uri,
	label,
	kind = "video",
	onPress,
	busy = false,
	actionLabel,
	actionIcon,
}: {
	uri?: string;
	label: string;
	kind?: "video" | "document";
	onPress: () => void;
	busy?: boolean;
	actionLabel?: string;
	actionIcon?: IconName;
}): ReactElement => {
	const theme = useTheme();
	const [failed, setFailed] = useState<string>();
	const [focused, setFocused] = useState(false);
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={
				kind === "document" ? `Open document ${label}` : label
			}
			accessibilityState={{ busy, disabled: busy }}
			disabled={busy}
			onPress={onPress}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={({ pressed }) => ({
				width: "100%",
				aspectRatio: kind === "video" ? 16 / 9 : undefined,
				minHeight: kind === "document" ? geometry.touch * 3 : geometry.touch,
				overflow: "hidden",
				borderRadius: corners.panel,
				backgroundColor: theme.background.secondary,
				alignItems: "center",
				justifyContent: "center",
				gap: space.sm,
				padding: kind === "document" ? space.lg : 0,
				opacity: pressed ? geometry.pressedOpacity : 1,
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: geometry.focus,
			})}
		>
			{uri && failed !== uri ? (
				<Image
					source={{ uri }}
					accessible={false}
					resizeMode="cover"
					onError={(): void => setFailed(uri)}
					style={{
						position: "absolute",
						inset: 0,
						width: "100%",
						height: "100%",
					}}
				/>
			) : undefined}
			<View
				pointerEvents="none"
				style={{
					flexDirection: "row",
					alignItems: "center",
					gap: space.xs,
					paddingVertical: space.sm,
					paddingHorizontal: space.md,
					borderRadius: corners.button,
					backgroundColor: theme.brand.background,
				}}
			>
				<Icon
					name={actionIcon ?? (kind === "video" ? "play" : "download")}
					color={theme.brand.foreground}
				/>
				<Text tone="onBrand" variant="label">
					{busy
						? "Loading…"
						: (actionLabel ?? (kind === "video" ? "Play" : "Open document"))}
				</Text>
			</View>
			{kind === "document" ? (
				<Text variant="caption" tone="secondary">
					{label}
				</Text>
			) : undefined}
		</Pressable>
	);
};
