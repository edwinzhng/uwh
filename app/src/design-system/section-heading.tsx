import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";
import { space } from "./tokens";
import { useControlSize } from "./use-control-size";

type Props = {
	children: ReactNode;
	action?: ReactNode;
	size?: "small";
	icon?: IconName;
};

export const SectionHeading = ({
	children,
	action,
	icon,
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
			<View
				style={{
					flexShrink: 1,
					flexDirection: "row",
					alignItems: "center",
					gap: space.xs,
				}}
			>
				{icon ? <Icon name={icon} tone="secondary" /> : undefined}
				<Text variant="h4">{children}</Text>
			</View>
			{action ? (
				<View
					style={{
						minWidth: 0,
						maxWidth: "100%",
						flexShrink: 1,
						marginLeft: "auto",
					}}
				>
					{action}
				</View>
			) : undefined}
		</View>
	);
};
