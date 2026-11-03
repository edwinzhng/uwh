import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
export const ClubCardPreviewFrame = ({
	size,
	children,
}: {
	size: "phone" | "desktop";
	children: ReactNode;
}): ReactElement => (
	<View
		style={{
			width: size === "phone" ? 358 : "100%",
			maxWidth: "100%",
			alignSelf: "flex-start",
		}}
	>
		{children}
	</View>
);
