import type { ReactElement } from "react";
import { useGoalReflections } from "../backend/use-goal-reflections";
import type { Member } from "../domain/app-types";
import { GoalReflections } from "./goal-reflections";

export const GoalReflectionsLive = ({
	member,
	open,
	onClose,
}: {
	member: Member;
	open: boolean;
	onClose: () => void;
}): ReactElement => (
	<GoalReflections
		member={member}
		open={open}
		onClose={onClose}
		service={useGoalReflections(member.id)}
	/>
);
