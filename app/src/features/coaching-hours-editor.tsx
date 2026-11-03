import { type ReactElement, useState } from "react";
import { Button, Dialog, Select, Stack, Text } from "../design-system";
import {
	type CoachingAssignment,
	coachingDurationEditError,
	coachingDurations,
	coachingHoursLabel,
} from "../domain/coaching-hours";
import { useFormTask } from "./use-form-task";

export const CoachingHoursEditor = ({
	assignment,
	scheduledMinutes,
	isDisabled,
	onSave,
	onClose,
}: {
	assignment: CoachingAssignment;
	scheduledMinutes: number;
	isDisabled: boolean;
	onSave: (minutes: number) => Promise<boolean>;
	onClose: () => void;
}): ReactElement => {
	const [minutes, setMinutes] = useState(assignment.durationMinutes);
	const [savedMinutes, setSavedMinutes] = useState(assignment.durationMinutes);
	const task = useFormTask();
	const save = async (): Promise<void> => {
		if (
			await task.submit(
				(): string | undefined =>
					coachingDurationEditError(
						minutes,
						scheduledMinutes,
						savedMinutes,
						assignment.durationMinutes,
					),
				async (): Promise<void> => {
					if (!(await onSave(minutes)))
						throw new Error("Couldn’t save hours. Try again.");
				},
			)
		)
			onClose();
	};
	return (
		<Dialog
			intent="form"
			isDismissDisabled={task.busy}
			title={`Hours · ${assignment.name}`}
			isOpen
			onOpenChange={(open): void => {
				if (!open && !task.busy) onClose();
			}}
			footer={
				<Button
					label="Save hours"
					isLoading={task.busy}
					isDisabled={isDisabled}
					onPress={(): void => {
						void save();
					}}
				/>
			}
		>
			<Stack>
				<Select
					label="Coaching time"
					value={String(minutes)}
					options={[...new Set([...coachingDurations, scheduledMinutes])]
						.sort((left, right) => left - right)
						.map((duration) => ({
							value: String(duration),
							label: coachingHoursLabel(duration),
						}))}
					isDisabled={isDisabled || task.busy}
					onValueChange={(value): void => {
						if (value) setMinutes(Number(value));
					}}
				/>
				{savedMinutes !== assignment.durationMinutes ? (
					<Button
						label="Reload saved hours"
						variant="ghost"
						isDisabled={task.busy}
						onPress={(): void => {
							setMinutes(assignment.durationMinutes);
							setSavedMinutes(assignment.durationMinutes);
							task.clear();
						}}
					/>
				) : undefined}
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
