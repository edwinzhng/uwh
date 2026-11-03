import { type ReactElement, useState } from "react";
import { Button, List, PersonChoice, Row, Stack, Text } from "../design-system";
import { useFormTask } from "./use-form-task";

export const CalendarPeople = ({
	people,
	selected,
	onSave,
}: {
	people: { id: string; name: string }[];
	selected: string[];
	onSave: (ids: string[]) => void;
}): ReactElement => {
	const [draft, setDraft] = useState(selected);
	const task = useFormTask();
	const chosen = people
		.filter((person) => draft.includes(person.id))
		.map((person) => person.id);
	return (
		<Stack gap="sm">
			<List>
				{people.map((person) => (
					<PersonChoice
						key={person.id}
						name={person.name}
						personId={person.id}
						checked={draft.includes(person.id)}
						isDisabled={task.busy}
						onChange={(checked): void =>
							setDraft((current) =>
								checked
									? [...current, person.id]
									: current.filter((id) => id !== person.id),
							)
						}
					/>
				))}
			</List>
			{task.error ? (
				<Text tone="danger" variant="small">
					{task.error}
				</Text>
			) : undefined}
			<Row justify="end">
				<Button
					label="Use selection"
					isLoading={task.busy}
					onPress={(): void => {
						void task.submit(
							() => (chosen.length ? undefined : "Choose at least one person."),
							async (): Promise<void> => onSave(chosen),
						);
					}}
				/>
			</Row>
		</Stack>
	);
};
