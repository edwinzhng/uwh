import type { ReactElement, ReactNode } from "react";
import { Badge } from "./badge";
import { Row } from "./row";
import { Stack } from "./stack";
import { Surface } from "./surface";
import { Text } from "./text";
import type { SpaceToken } from "./tokens";

type Props = {
	staffRole: "coach" | "admin" | undefined;
	title?: string;
	action?: ReactNode;
	padding?: SpaceToken;
	children?: ReactNode;
};
export const StaffSection = ({
	staffRole,
	title,
	action,
	padding = "md",
	children,
}: Props): ReactElement => {
	if (!staffRole) return <>{children}</>;
	const label = staffRole === "coach" ? "Coach" : "Admin";
	return (
		<Stack gap="sm">
			<Row justify="between" wrap>
				<Row gap="xs">
					<Badge label={label} kind={staffRole} />
					{title ? <Text variant="h4">{title}</Text> : undefined}
				</Row>
				{action}
			</Row>
			{children ? (
				<Surface padding={padding}>
					<Stack gap="sm">{children}</Stack>
				</Surface>
			) : undefined}
		</Stack>
	);
};
