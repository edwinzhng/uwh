import { type ReactElement, useState } from "react";
import {
	Button,
	Combobox,
	IconButton,
	Row,
	Stack,
	Text,
} from "../design-system";
import type { CoachOption } from "../domain/coaching-hours";
import { useFormTask } from "./use-form-task";

export const CoachAssignmentPicker = ({
	coaches,
	isDisabled,
	backupCoachIds = [],
	backup = false,
	onAdd,
}: {
	coaches: CoachOption[];
	isDisabled: boolean;
	backupCoachIds?: string[];
	backup?: boolean;
	onAdd: (coachId: string) => Promise<boolean>;
}): ReactElement => {
	const [coachId, setCoachId] = useState<string>();
	const task = useFormTask();
	const selected = coaches.find((coach) => coach.coachId === coachId);
	const add = async (): Promise<void> => {
		await task.submit(
			(): string | undefined => (selected ? undefined : "Choose a coach"),
			async (): Promise<void> => {
				if (selected && (await onAdd(selected.coachId))) setCoachId(undefined);
			},
		);
	};
	return (
		<Stack gap="sm">
			<Combobox
				label={backup ? "Backup coach" : "Coach"}
				placeholder="Find a coach"
				value={selected?.coachId}
				options={coaches.map((coach) => ({
					value: coach.coachId,
					label: coach.name,
					person: { id: coach.personId, name: coach.name },
				}))}
				onValueChange={setCoachId}
				isDisabled={isDisabled || task.busy}
			/>
			{selected && backupCoachIds.includes(selected.coachId) ? (
				<Text variant="small" tone="secondary">
					On the backup list
				</Text>
			) : undefined}
			<Row gap="xs" wrap>
				<Button
					label={backup ? "Add backup coach" : "Add coach"}
					accessibilityLabel={
						selected
							? `Add ${selected.name} as ${backup ? "a backup coach" : "a coach"}`
							: undefined
					}
					prefix="plus"
					isLoading={task.busy}
					isDisabled={!selected || isDisabled}
					onPress={(): void => {
						void add();
					}}
				/>
				{selected ? (
					<IconButton
						label={`Clear selected coach ${selected.name}`}
						icon="close"
						isDisabled={isDisabled || task.busy}
						onPress={(): void => setCoachId(undefined)}
					/>
				) : undefined}
			</Row>
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
		</Stack>
	);
};
