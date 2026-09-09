import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Button, Row } from "../design-system";
import type { Member } from "../domain/app-types";

export const GoalCheckins = ({ member }: { member: Member }): ReactElement => {
	const { busy, dispatch } = useApp();
	return (
		<Row gap="xs" wrap>
			<Button
				label="Undo"
				variant="ghost"
				isDisabled={busy || member.steps <= 0}
				onPress={(): void => {
					void dispatch({ type: "goal-step", personId: member.id, delta: -1 });
				}}
			/>
			<Button
				label="Check in"
				prefix="plus"
				variant="secondary"
				isDisabled={busy || member.steps >= 6}
				onPress={(): void => {
					void dispatch({ type: "goal-step", personId: member.id, delta: 1 });
				}}
			/>
		</Row>
	);
};
