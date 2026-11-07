import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { LineupRoleMenu } from "../design-system";
import { memberName } from "../domain/app-rules";
import type { LineupSide } from "../domain/lineup";
export const TeamCaptain = ({
	side,
	roleLabel = "Captain",
	people,
	personId,
	onChange,
	displayName,
	dragScope,
}: {
	side: LineupSide;
	roleLabel?: "Captain" | "Vice Captain";
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
			roleLabel={roleLabel}
			dragScope={dragScope}
			label={`${side === "black" ? "Black" : "White"} ${roleLabel.toLowerCase()}`}
			people={people.map((id) => ({ id, name: memberName(data, id) }))}
			personId={personId}
			displayName={
				displayName ?? (personId ? memberName(data, personId) : undefined)
			}
			onChange={onChange}
		/>
	);
};
