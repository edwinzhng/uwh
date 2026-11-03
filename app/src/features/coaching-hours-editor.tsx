import { type ReactElement, useState } from "react";
import { Button, Dialog, Select, Stack, Text } from "../design-system";
import {
	type CoachingAssignment,
	coachingDurations,
	coachingHoursLabel,
	validCoachingDuration,
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
	const task = useFormTask();
	const save = async (): Promise<void> => {
		if (
			await task.submit(
				(): string | undefined =>
					validCoachingDuration(minutes) || minutes === scheduledMinutes
						? undefined
						: "Choose coaching time",
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
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
