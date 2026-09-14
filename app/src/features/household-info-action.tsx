import { useMutation } from "convex/react";
import { useSetAtom } from "jotai";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { previewDataAtom, useApp } from "../demo/app-state";
import { Button, Dialog, Field, Stack, Text } from "../design-system";
import type { Member } from "../domain/app-types";
import { useFormTask } from "./use-form-task";

type Props = { person: Member };
const HouseholdInfoForm = ({
	person,
	save,
}: Props & { save: (name: string) => Promise<void> }): ReactElement => {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState(person.name);
	const task = useFormTask();
	const changeOpen = (value: boolean): void => {
		if (task.busy) return;
		task.clear();
		setName(person.name);
		setOpen(value);
	};
	return (
		<>
			<Button
				label="Edit info"
				variant="secondary"
				onPress={(): void => changeOpen(true)}
			/>
			<Dialog
				title={`Edit ${person.name}`}
				isOpen={open}
				onOpenChange={changeOpen}
				footer={
					<Button
						label="Save"
						isLoading={task.busy}
						onPress={(): void => {
							void task.submit(
								() =>
									!name.trim() || name.trim().length > 80
										? "Enter a name under 80 characters."
										: undefined,
								async (): Promise<void> => {
									await save(name.trim());
									setOpen(false);
								},
							);
						}}
					/>
				}
			>
				<Stack>
					<Field
						label="Name"
						value={name}
						onValueChange={setName}
						maxLength={80}
						isDisabled={task.busy}
					/>
					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
				</Stack>
			</Dialog>
		</>
	);
};
const LiveHouseholdInfo = ({ person }: Props): ReactElement => {
	const update = useMutation(api.account.updateHouseholdInfo);
	return (
		<HouseholdInfoForm
			person={person}
			save={async (name): Promise<void> => {
				await update({ personId: person.id, name });
			}}
		/>
	);
};
const PreviewHouseholdInfo = ({ person }: Props): ReactElement => {
	const setData = useSetAtom(previewDataAtom);
	return (
		<HouseholdInfoForm
			person={person}
			save={async (name): Promise<void> => {
				setData((data) => ({
					...data,
					members: data.members.map((member) =>
						member.id === person.id ? { ...member, name } : member,
					),
				}));
			}}
		/>
	);
};
export const HouseholdInfoAction = ({ person }: Props): ReactElement => {
	const { source } = useApp();
	return source === "convex" ? (
		<LiveHouseholdInfo person={person} />
	) : (
		<PreviewHouseholdInfo person={person} />
	);
};
