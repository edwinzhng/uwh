import { type ReactElement, useContext } from "react";
import { Badge } from "../design-system";
import { AttendanceFlagContext } from "./attendance-flag-context";

export const AttendanceFlagBadge = ({
	personId,
}: {
	personId: string;
}): ReactElement | undefined => {
	const context = useContext(AttendanceFlagContext);
	const flag = context?.flags.find(
		(entry) => entry.personId === personId,
	)?.kind;
	return flag ? (
		<Badge
			kind="warning"
			label={flag === "addition" ? "Late addition" : "Late cancellation"}
		/>
	) : undefined;
};
