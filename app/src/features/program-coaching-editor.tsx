import { type ReactElement, useState } from "react";
import type { WeeklyCoachingState } from "../backend/use-coaching-schedule";
import { useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	IconButton,
	List,
	ListItem,
	Select,
	Stack,
	Text,
} from "../design-system";
import {
	validateCoachingSchedule,
	type WeeklyCoachingSchedule,
} from "../domain/coaching-schedule";
import { clubPrograms } from "../domain/programs";
import { CoachAssignmentPicker } from "./coach-assignment-picker";
import { useFormTask } from "./use-form-task";

export const ProgramCoachingEditor = ({
	state,
	schedule,
	onClose,
	initialProgramId,
}: {
	state: WeeklyCoachingState;
	schedule: WeeklyCoachingSchedule;
	onClose: () => void;
	initialProgramId?: string;
}): ReactElement => {
	const [draft, setDraft] = useState(schedule);
	const { data, account } = useApp();
	const programs = clubPrograms(data).filter(
		(program) =>
			!program.archived &&
			(account.admin || account.coachPrograms.includes(program.id)),
	);
	const [day, setDay] = useState(
		initialProgramId ?? programs.at(0)?.id ?? "backup",
	);
	const task = useFormTask();
	const selected =
		day === "backup"
			? draft.backupCoachIds
			: (draft.programs?.find((entry) => entry.programId === day)?.coachIds ??
				[]);
	const dayLabel =
		day === "backup"
			? "the backup list"
			: `${programs.find((entry) => entry.id === day)?.name ?? day}’s program defaults`;
	const available = state.coaches.filter(
		(coach) =>
			!selected.includes(coach.coachId) &&
			(day === "backup" || coach.programIds?.includes(day)),
	);
	const change = (coachIds: string[]): void =>
		setDraft((current) =>
			day === "backup"
				? { ...current, backupCoachIds: coachIds }
				: {
						...current,
						programs: [
							...(current.programs ?? []).filter(
								(entry) => entry.programId !== day,
							),
							{ programId: day, coachIds },
						],
					},
		);
	const save = async (): Promise<void> => {
		if (
			await task.submit(
				(): string | undefined => validateCoachingSchedule(draft),
				async (): Promise<void> => state.save(draft),
			)
		)
			onClose();
	};
	return (
		<Dialog
			intent="form"
			isDismissDisabled={task.busy}
			title="Program coaches"
			isOpen
			onOpenChange={(open): void => {
				if (!open && !task.busy) onClose();
			}}
			footer={
				<Button
					label="Save"
					isLoading={task.busy}
					onPress={(): void => {
						void save();
					}}
				/>
			}
		>
			<Stack>
				<Text variant="small" tone="secondary">
					Defaults only. Record hours in each practice; existing practice
					assignments won’t change. Additions and removals apply when you save.
				</Text>
				<Select
					label="Program"
					value={day}
					isDisabled={task.busy}
					options={[
						...programs.map((program) => ({
							value: program.id,
							label: program.name,
						})),
						{ value: "backup", label: "Backup coaches" },
					]}
					onValueChange={(value): void => {
						if (value) {
							setDay(value);
							task.clear();
						}
					}}
				/>
				<List>
					{selected.map((id) => {
						const name =
							state.coaches.find((coach) => coach.coachId === id)?.name ??
							"Former coach";
						return (
							<ListItem
								key={id}
								title={name}
								avatar={name}
								flush
								trailing={
									<IconButton
										label={`Remove ${name} from ${dayLabel}`}
										icon="trash"
										isDisabled={task.busy}
										onPress={(): void =>
											change(selected.filter((entry) => entry !== id))
										}
									/>
								}
							/>
						);
					})}
				</List>
				{available.length > 0 ? (
					<CoachAssignmentPicker
						key={day}
						coaches={available}
						isDisabled={task.busy}
						backup={day === "backup"}
						onAdd={async (coachId): Promise<boolean> => {
							change([...selected, coachId]);
							return true;
						}}
					/>
				) : undefined}
				{day === "backup" ? (
					<Text variant="small" tone="secondary">
						Backup coaches are suggested when editing a session. They are not
						automatically assigned or credited hours.
					</Text>
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
