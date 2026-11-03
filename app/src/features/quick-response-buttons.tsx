import type { ReactElement } from "react";
import { Button, Row, Stack, Text } from "../design-system";

export const QuickResponseButtons = ({
	name,
	response,
	full = false,
	disabled = false,
	onRespond,
}: {
	name: string;
	response: string;
	full?: boolean;
	disabled?: boolean;
	onRespond: (going: boolean) => void;
}): ReactElement => (
	<Stack gap="none">
		{response === "waiting" ? (
			<Text variant="caption" tone="warning">
				Waitlisted
			</Text>
		) : undefined}
		<Row gap="xs">
			<Button
				label={full && response !== "going" ? "Waitlist" : "Yes"}
				accessibilityLabel={`${name} · ${full && response !== "going" ? "Join waitlist" : "Attending"}`}
				prefix="check"
				variant={
					response === "going"
						? "solid"
						: response === "waiting"
							? "selection"
							: "secondary"
				}
				isSelected={response === "going" || response === "waiting"}
				isDisabled={disabled}
				compact
				onPress={(): void => onRespond(true)}
			/>
			<Button
				label="No"
				accessibilityLabel={`${name} · Not attending`}
				prefix="close"
				variant={response === "unavailable" ? "danger" : "secondary"}
				isSelected={response === "unavailable"}
				isDisabled={disabled}
				compact
				onPress={(): void => onRespond(false)}
			/>
		</Row>
	</Stack>
);
