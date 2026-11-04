import { type ReactElement, useState } from "react";
import { Image, Pressable } from "react-native";
import artwork from "../../assets/club-logo.png";
import { GlassPanel } from "./glass-panel";
import { useButtonHaptics } from "./haptics";
import { useTheme } from "./theme";
import { geometry, space } from "./tokens";

export const ClubMark = ({
	onPress,
	selected = false,
}: {
	onPress: () => void;
	selected?: boolean;
}): ReactElement => {
	const theme = useTheme();
	const haptic = useButtonHaptics();
	const [focused, setFocused] = useState(false);
	return (
		<GlassPanel padding="none" shape="pill" interactive seamless>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Open Club"
				accessibilityState={{ selected }}
				onPress={(): void => {
					haptic();
					onPress();
				}}
				onFocus={(): void => setFocused(true)}
				onBlur={(): void => setFocused(false)}
				style={({ pressed }) => ({
					width: geometry.touch,
					height: geometry.touch,
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: pressed ? theme.background.pressed : "transparent",
					outlineWidth: focused ? geometry.focus : 0,
					outlineColor: theme.focus,
					outlineOffset: -geometry.focus,
					borderRadius: geometry.touch / 2,
				})}
			>
				<Image
					source={artwork}
					accessible={false}
					resizeMode="contain"
					style={{
						width: geometry.touch - space.sm,
						height: geometry.touch - space.sm,
						borderRadius: geometry.touch / 2,
					}}
				/>
			</Pressable>
		</GlassPanel>
	);
};
