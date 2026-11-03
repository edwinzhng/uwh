import type { ReactElement } from "react";
import { Icon, Row, Text } from "../design-system";
import {
	fitnessChange,
	type PersonalFitnessRow,
} from "../domain/personal-fitness";

export const FitnessChangeIndicator = ({
	row,
}: {
	row: PersonalFitnessRow;
}): ReactElement | undefined => {
	const change = fitnessChange(row);
	if (!change) return;
	const tone =
		change.direction === "equal"
			? "secondary"
			: change.improved
				? "success"
				: "danger";
	return (
		<Row gap="xs">
			{change.direction !== "equal" ? (
				<Icon
					name={change.direction === "up" ? "arrowUp" : "arrowDown"}
					tone={tone}
					size="sm"
				/>
			) : undefined}
			<Text
				variant="caption"
				tone={tone}
				accessibilityLabel={
					change.direction === "equal"
						? "Unchanged from previous result"
						: `${change.value} ${change.improved ? "improvement" : "regression"} from previous result`
				}
			>
				{change.direction === "equal" ? "No change" : change.value}
			</Text>
		</Row>
	);
};
