import { type ReactElement, useState } from "react";
import { Image, View } from "react-native";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry } from "./tokens";

export const MediaImage = ({
	uri,
	label,
	compact = false,
}: {
	uri: string;
	label: string;
	compact?: boolean;
}): ReactElement => {
	const theme = useTheme();
	const [failed, setFailed] = useState<string>();
	return (
		<View
			style={{
				width: compact ? geometry.avatar * 2 : "100%",
				aspectRatio: 16 / 9,
				borderRadius: corners.control,
				overflow: "hidden",
				backgroundColor: theme.background.secondary,
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{failed === uri ? (
				<Text variant="caption" tone="secondary">
					Image unavailable
				</Text>
			) : (
				<Image
					source={{ uri }}
					accessibilityLabel={label}
					resizeMode="cover"
					onError={(): void => setFailed(uri)}
					style={{ width: "100%", height: "100%" }}
				/>
			)}
		</View>
	);
};
