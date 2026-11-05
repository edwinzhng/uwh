import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { Text } from "./text";
import { useControlSize } from "./use-control-size";

export const CenteredHeading = ({
	children,
	action,
}: {
	children: ReactNode;
	action?: ReactNode;
}): ReactElement => {
	const size = useControlSize();
	return (
		<View style={{ flexDirection: "row", alignItems: "center", minWidth: 0 }}>
			{action ? (
				<View
					accessible={false}
					pointerEvents="none"
					style={{ width: size, flexShrink: 0 }}
				/>
			) : undefined}
			<View style={{ flex: 1, minWidth: 0 }}>
				<Text variant="h4" align="center" lines={3}>
					{children}
				</Text>
			</View>
			{action ? (
				<View style={{ width: size, flexShrink: 0, alignItems: "center" }}>
					{action}
				</View>
			) : undefined}
		</View>
	);
};
