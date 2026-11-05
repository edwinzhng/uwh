import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { LineupRoleMenu } from "../design-system";
import { memberName } from "../domain/app-rules";
import type { LineupSide } from "../domain/lineup";
export const TeamCaptain = ({
	side,
	people,
	personId,
	onChange,
	displayName,
	dragScope,
}: {
	side: LineupSide;
	people: string[];
	personId?: string;
	displayName?: string;
	dragScope?: string;
	onChange?: (id?: string) => void;
}): ReactElement | undefined => {
	const { data } = useApp();
	if (!onChange && !personId) return undefined;
	return (
		<LineupRoleMenu
			roleLabel="Captain"
			dragScope={dragScope}
			label={`${side === "black" ? "Black" : "White"} captain`}
			people={people.map((id) => ({ id, name: memberName(data, id) }))}
			personId={personId}
			displayName={
				displayName ?? (personId ? memberName(data, personId) : undefined)
			}
			onChange={onChange}
		/>
	);
};
