import { type ReactElement, useState } from "react";
import { newId, useApp } from "../demo/app-state";
import { Button, Dialog, Field, Row, Select, Stack } from "../design-system";
import { eventAttendees, memberName } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { useClubToday } from "./use-club-today";
import { useFormTask } from "./use-form-task";

export const ShoutoutEditor = ({
	personId,
	event,
}: {
	personId?: string;
	event?: ClubEvent;
}): ReactElement => {
	const { account, data, dispatch } = useApp();
	const today = useClubToday();
	const task = useFormTask();
	const choices = eventAttendees(data, event?.id ?? "");
	const members = choices.length ? choices : data.members;
	const [open, setOpen] = useState(false);
	const [targetId, setTargetId] = useState(personId ?? account.personId);
	const [body, setBody] = useState("");
	const save = async (): Promise<void> => {
		await task.submit(
			() =>
				!targetId || !body.trim()
					? "Choose a player and write a shoutout."
					: undefined,
			async (): Promise<void> => {
				const saved = await dispatch({
					type: "save-feedback",
					feedback: {
						id: newId(),
						personId: targetId,
						authorId: account.id,
						eventId: event?.id,
						body: body.trim(),
						visibility: "published",
						date: event?.date ?? today,
					},
				});
				if (!saved)
					throw new Error("Could not share this shoutout. Try again.");
				setBody("");
				setOpen(false);
			},
		);
	};
	return (
		<>
			<Button
				label="Give shoutout"
				prefix="plus"
				variant="secondary"
				onPress={(): void => setOpen(true)}
			/>
			<Dialog
				title="Give a shoutout"
				isOpen={open}
				onOpenChange={(value): void => {
					if (!task.busy) setOpen(value);
				}}
				footer={
					<Row>
						<Button
							label="Share shoutout"
							isLoading={task.busy}
							validationError={
								!targetId || !body.trim()
									? "Check the required fields"
									: undefined
							}
							onPress={(): void => {
								void save();
							}}
						/>
					</Row>
				}
			>
				<Stack>
					{personId ? undefined : (
						<Select
							label="Player"
							value={targetId}
							options={members.map((member) => ({
								value: member.id,
								label: member.name,
							}))}
							onValueChange={(value): void =>
								setTargetId(value ?? account.personId)
							}
							isDisabled={task.busy}
						/>
					)}
					<Field
						label={
							personId
								? `Shoutout for ${memberName(data, personId)}`
								: "Shoutout"
						}
						placeholder="What did they do well?"
						value={body}
						onValueChange={setBody}
						multiline
						rows={4}
						maxLength={1000}
						isDisabled={task.busy}
					/>
				</Stack>
			</Dialog>
		</>
	);
};
