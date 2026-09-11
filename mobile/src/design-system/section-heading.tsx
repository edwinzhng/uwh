import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { Text } from "./text";
import { space } from "./tokens";
import { useControlSize } from "./use-control-size";

type Props = {
	children: ReactNode;
	action?: ReactNode;
	size?: "standard" | "small";
};

export const SectionHeading = ({
	children,
	action,
	size = "small",
}: Props): ReactElement => {
	const height = useControlSize();
	return (
		<View
			style={{
				minHeight: height,
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "space-between",
				flexWrap: "wrap",
				gap: space.sm,
			}}
		>
			<View style={{ flexShrink: 1 }}>
				<Text variant={size === "small" ? "h4" : "h3"}>{children}</Text>
			</View>
			{action}
		</View>
	);
};
