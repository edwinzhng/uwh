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
							icon: "plus",
							onSelect: (): void => context.set(personId, "addition", partId),
						},
						{
							id: "cancellation",
							label: "Late cancellation",
							icon: "clock",
							onSelect: (): void => context.set(personId, "cancellation"),
						},
						{
							id: "clear",
							label: "Clear flag",
							icon: "close",
							isDisabled: !flag,
							onSelect: (): void => context.set(personId),
						},
					],
				},
			]}
		/>
	);
};
