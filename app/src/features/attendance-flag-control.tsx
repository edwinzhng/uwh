import { type ReactElement, useContext } from "react";
import { ActionMenu } from "../design-system";
import { AttendanceFlagContext } from "./attendance-flag-context";

export const AttendanceFlagControl = ({
	personId,
	name,
	disabled,
	partId,
}: {
	personId: string;
	name: string;
	disabled: boolean;
	partId?: string;
}): ReactElement | undefined => {
	const context = useContext(AttendanceFlagContext);
	if (!context) return undefined;
	const flag = context.flags.find((entry) => entry.personId === personId)?.kind;
	return (
		<ActionMenu
			label={`Attendance flags · ${name}`}
			icon="more"
			isDisabled={disabled || context.busy}
			groups={[
				{
					id: "flags",
					items: [
						{
							id: "addition",
							label: "Late addition",
							onSelect: (): void => context.set(personId, "addition", partId),
						},
						{
							id: "cancellation",
							label: "Late cancellation",
							onSelect: (): void => context.set(personId, "cancellation"),
						},
						{
							id: "clear",
							label: "Clear flag",
							isDisabled: !flag,
							onSelect: (): void => context.set(personId),
						},
					],
				},
			]}
		/>
	);
};
