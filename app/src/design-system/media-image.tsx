import { type ReactElement, useEffect, useState } from "react";
import { Image, View } from "react-native";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry } from "./tokens";

export const MediaImage = ({
	uri,
	label,
	compact = false,
	naturalSize = false,
}: {
	uri: string;
	label: string;
	compact?: boolean;
	naturalSize?: boolean;
}): ReactElement => {
	const theme = useTheme();
	const [dimensions, setDimensions] = useState<{
		uri: string;
		ratio: number;
	}>();
	useEffect(() => {
		if (!naturalSize) return;
		const pending = { active: true };
		Image.getSize(
			uri,
			(width, height): void => {
				if (pending.active && width > 0 && height > 0)
					setDimensions({ uri, ratio: width / height });
			},
			(): void => {},
		);
		return (): void => {
			pending.active = false;
		};
	}, [uri, naturalSize]);
	const [failed, setFailed] = useState<string>();
	return (
		<View
			style={{
				width: compact ? geometry.avatar * 2 : "100%",
				aspectRatio:
					naturalSize && dimensions?.uri === uri ? dimensions.ratio : 16 / 9,
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
					resizeMode={naturalSize ? "contain" : "cover"}
					onError={(): void => setFailed(uri)}
					style={{ width: "100%", height: "100%" }}
				/>
			)}
		</View>
	);
};
