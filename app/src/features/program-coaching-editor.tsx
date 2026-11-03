import { type ReactElement, useState } from "react";
import type { WeeklyCoachingState } from "../backend/use-coaching-schedule";
import { useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	MultiSelect,
	Select,
	Stack,
	Text,
} from "../design-system";
import {
	validateCoachingSchedule,
	type WeeklyCoachingSchedule,
} from "../domain/coaching-schedule";
import { clubPrograms } from "../domain/programs";

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
	const available = state.coaches.filter(
		(coach) =>
			selected.includes(coach.coachId) ||
			day === "backup" ||
			coach.programIds?.includes(day),
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
					Hours are counted automatically after each practice. Practice
					overrides and completed history stay unchanged. Additions and removals
					apply when you save.
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
				<MultiSelect
					label="Coaches"
					placeholder="Choose coaches"
					values={selected}
					options={[
						...available.map((coach) => ({
							value: coach.coachId,
							label: coach.name,
							person: { id: coach.personId },
						})),
						...selected
							.filter((id) => !available.some((coach) => coach.coachId === id))
							.map((id) => ({ value: id, label: "Former coach" })),
					]}
					maxSelections={day === "backup" ? 16 : 3}
					isDisabled={task.busy}
					onToggle={(id, assigned): void => {
						change(
							assigned
								? [...selected, id]
								: selected.filter((entry) => entry !== id),
						);
						task.clear();
					}}
				/>
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
