import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Select } from "../design-system";
import type { Attendance } from "../domain/club";
import { useFormTask } from "./use-form-task";

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
	const task = useFormTask();
	const mark = (attendance: Attendance): void => {
		if (disabled || value === attendance) return;
		void task.submit(
			() => undefined,
			async (): Promise<void> => {
				const saved = await dispatch({
					type: "attendance",
					eventId,
					partId,
					personId,
					attendance,
				});
				if (!saved) throw new Error("Couldn’t save attendance. Try again.");
			},
		);
	};
	return (
		<Select<Attendance>
			label={`Attendance · ${name}`}
			hideLabel
			compact
			value={value}
			isDisabled={disabled || task.busy}
			options={[
				{ value: "present", label: "Here", tone: "success" },
				{ value: "late", label: "Late", tone: "warning" },
				{ value: "absent", label: "No-show", tone: "danger" },
				...(!defaultHere || value === "unmarked"
					? [{ value: "unmarked" as const, label: "Not marked" }]
					: []),
			]}
			onValueChange={(attendance): void => {
				if (attendance) mark(attendance);
			}}
		/>
	);
};
