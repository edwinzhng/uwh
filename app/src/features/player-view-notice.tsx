import type { ReactElement } from "react";
import { Button, Row, Text } from "../design-system";
import { useRoleViewChoice } from "./role-view-scope";

export const PlayerViewNotice = (): ReactElement | undefined => {
	const choice = useRoleViewChoice();
	if (choice?.value !== "personal") return undefined;
	return (
		<Row justify="between" align="center" wrap>
			<Text variant="small" tone="secondary">
				Player view · coach and admin tools are hidden
			</Text>
			<Button
				label="Back to coach view"
				variant="ghost"
				onPress={(): void => choice.onValueChange("coaching")}
			/>
		</Row>
	);
};
