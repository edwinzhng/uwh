import { type ReactElement, useState } from "react";
import { newId, useApp } from "../demo/app-state";
import { Button, Combobox, Dialog, Field, Stack, Text } from "../design-system";
import { programs as clubPrograms, validDate } from "../domain/app-rules";
import { useClubToday } from "./use-club-today";
import { useFormTask } from "./use-form-task";

export const NoticeComposer = ({
	isOpen,
	onOpenChange,
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}): ReactElement => {
	const { account, data, dispatch } = useApp();
	const today = useClubToday();
	const task = useFormTask();
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [expiresAt, setExpiresAt] = useState("");
	const [program, setProgram] = useState(
		account.admin ? "all" : account.coachPrograms.at(0),
	);
	const programs = account.admin
		? [
				"all",
				...new Set([
					...clubPrograms.map((entry) => entry.value),
					...data.members.flatMap((person) => person.programs),
				]),
			]
		: account.coachPrograms;
	const save = async (): Promise<void> => {
		await task.submit(
			() =>
				!title.trim() || !body.trim() || !program
					? "Add a title, message, and audience."
					: expiresAt && (!validDate(expiresAt) || expiresAt <= today)
						? "Enter a future expiry date as YYYY-MM-DD."
						: undefined,
			async (): Promise<void> => {
				if (!program) return;
				const saved = await dispatch({
					type: "create-notice",
					notice: {
						id: newId(),
						title: title.trim(),
						body: body.trim(),
						program,
						date: today,
						expiresAt: expiresAt || undefined,
						acknowledgedBy: [],
					},
				});
				if (!saved)
					throw new Error("Could not publish this notice. Please try again.");
				onOpenChange(false);
				setTitle("");
				setBody("");
				setExpiresAt("");
			},
		);
	};
	return (
		<Dialog
			title="New notice"
			staffRole={account.admin ? "admin" : "coach"}
			isOpen={isOpen}
			onOpenChange={(open): void => {
				if (!task.busy) {
					task.clear();
					onOpenChange(open);
				}
			}}
			footer={
				<Button
					label="Publish notice"
					isLoading={task.busy}
					onPress={(): void => {
						void save();
					}}
				/>
			}
		>
			<Stack>
				<Field
					label="Title"
					value={title}
					onValueChange={setTitle}
					isDisabled={task.busy}
				/>
				<Field
					label="Message"
					value={body}
					onValueChange={setBody}
					multiline
					isDisabled={task.busy}
				/>
				<Combobox
					label="Audience"
					value={program}
					onValueChange={setProgram}
					options={programs.map((value) => ({
						value,
						label: value === "all" ? "Whole club" : value,
					}))}
					isDisabled={task.busy}
				/>
				<Field
					label="Hide starting (optional)"
					placeholder="YYYY-MM-DD"
					value={expiresAt}
					onValueChange={setExpiresAt}
					isDisabled={task.busy}
				/>
				{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
			</Stack>
		</Dialog>
	);
};
