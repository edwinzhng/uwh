import { type ReactElement, useContext } from "react";
import { ActionMenu } from "../design-system";
import { AttendanceFlagContext } from "./attendance-flag-context";

export const AttendanceFlagControl = ({
	personId,
	name,
	disabled,
}: {
	personId: string;
	name: string;
	disabled: boolean;
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
							label: "Last-minute addition",
							onSelect: (): void => context.set(personId, "addition"),
						},
						{
							id: "cancellation",
							label: "Last-minute cancellation",
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
