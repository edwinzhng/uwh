import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { Badge } from "./badge";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

type Props = {
	staffRole: "coach" | "admin" | undefined;
	title?: string;
	action?: ReactNode;
	children?: ReactNode;
};

export const StaffSection = ({
	staffRole,
	title,
	action,
	children,
}: Props): ReactElement => {
	const theme = useTheme();
	if (!staffRole) return <>{children}</>;
	return (
		<Stack gap="sm">
			<View
				style={{
					padding: space.xs,
					backgroundColor: theme[staffRole].background,
					borderColor: theme.colorScales[staffRole].border,
					borderWidth: geometry.border,
					borderRadius: corners.panel,
				}}
			>
				<Row justify="between" wrap gap="xs">
					<Row gap="xs" wrap>
						<Badge
							compact
							label={staffRole === "coach" ? "Coach" : "Admin"}
							kind={staffRole}
						/>
						{title ? <Text variant="label">{title}</Text> : undefined}
					</Row>
					{action}
				</Row>
			</View>
			{children}
		</Stack>
	);
};
