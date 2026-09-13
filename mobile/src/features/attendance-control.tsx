import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import { Select } from "../design-system";
import type { Attendance } from "../domain/club";

export const AttendanceControl = ({
	eventId,
	partId,
	personId,
	name,
	value,
	disabled,
	defaultHere = false,
}: {
	eventId: string;
	partId?: string;
	personId: string;
	name: string;
	value: Attendance;
	disabled: boolean;
	defaultHere?: boolean;
}): ReactElement => {
	const { dispatch } = useApp();
	const [pending, setPending] = useState<Attendance>();
	const mark = async (attendance: Attendance): Promise<void> => {
		if (pending || disabled || value === attendance) return;
		const next = attendance;
		setPending(next);
		await dispatch({
			type: "attendance",
			eventId,
			partId,
			personId,
			attendance: next,
		});
		setPending(undefined);
	};
	return (
		<Select<Attendance>
			label={`Attendance · ${name}`}
			hideLabel
			compact
			value={value}
			isDisabled={disabled || pending !== undefined}
			options={[
				{ value: "present", label: "Here", tone: "success" },
				{ value: "late", label: "Late", tone: "warning" },
				{ value: "absent", label: "No-show", tone: "danger" },
				...(!defaultHere || value === "unmarked"
					? [{ value: "unmarked" as const, label: "Not marked" }]
					: []),
			]}
			onValueChange={(attendance): void => {
				if (attendance) void mark(attendance);
			}}
		/>
	);
};
