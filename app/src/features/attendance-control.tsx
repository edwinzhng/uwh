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
	onLateAddition,
	onAbsent,
}: {
	eventId: string;
	partId?: string;
	personId: string;
	name: string;
	value: Attendance;
	disabled: boolean;
	defaultHere?: boolean;
	onLateAddition?: () => void;
	onAbsent?: () => void;
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
		<Select<Attendance | "addition">
			label={`Attendance · ${name}`}
			hideLabel
			compact
			value={value}
			isDisabled={disabled || task.busy}
			options={[
				{ value: "present", label: "Here", tone: "success" },
				{ value: "late", label: "Late", tone: "warning" },
				{ value: "absent", label: "Absent", tone: "danger" },
				{ value: "unmarked", label: "No reply" },
				...(onLateAddition
					? [{ value: "addition" as const, label: "Late addition" }]
					: []),
			]}
			onValueChange={(attendance): void => {
				if (attendance === "addition") {
					onLateAddition?.();
					return;
				}
				if (attendance === "absent") onAbsent?.();
				if (attendance) mark(attendance);
			}}
		/>
	);
};
