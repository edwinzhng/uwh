import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { type ReactElement, type ReactNode, useState } from "react";
import { StyleSheet, UIManager, View } from "react-native";
import { messageFadeLocations } from "./edge-fade";
import { useReduceTransparency } from "./material-accessibility";
import { space } from "./tokens";

export const MessageViewport = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const [height, setHeight] = useState(0);
	const opaque = useReduceTransparency();
	const available = Boolean(UIManager.getViewManagerConfig("RNCMaskedView"));
	return (
		<View
			onLayout={(event): void => setHeight(event.nativeEvent.layout.height)}
			style={{ flex: 1, minHeight: 0 }}
		>
			{available ? (
				<MaskedView
					style={{ flex: 1 }}
					maskElement={
						opaque ? (
							<View
								style={[StyleSheet.absoluteFill, { backgroundColor: "black" }]}
							/>
						) : (
							<LinearGradient
								colors={["transparent", "black", "black", "transparent"]}
								locations={messageFadeLocations(height, space.sm)}
								style={StyleSheet.absoluteFill}
							/>
						)
					}
				>
					{children}
				</MaskedView>
			) : (
				children
			)}
		</View>
	);
};
