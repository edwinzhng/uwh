import type { Href } from "expo-router";
import type { ReactElement } from "react";
import { Badge } from "./badge";
import { RoleStyleGroup } from "./role-style-group";
import type { RoleStyle } from "./role-style-preview-types";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
export const RoleStyleOption = ({
	treatment,
	title,
	detail,
	onOpen,
}: {
	treatment: RoleStyle;
	title: string;
	detail: string;
	onOpen: (href: Href) => void;
}): ReactElement => (
	<Stack gap="lg">
		<Stack gap="xs">
			<Row gap="xs" wrap>
				<Text variant="h3">{title}</Text>
				{treatment === "glow" ? <Badge label="Recommended" /> : undefined}
			</Row>
			<Text variant="small" tone="secondary">
				{detail}
			</Text>
		</Stack>
		<RoleStyleGroup roleKind="coach" treatment={treatment} onOpen={onOpen} />
		<RoleStyleGroup roleKind="admin" treatment={treatment} onOpen={onOpen} />
	</Stack>
);
