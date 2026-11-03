import { type ReactElement, useRef, useState } from "react";
import { newId, useApp, useAppStatus } from "../demo/app-state";
import {
	Button,
	Dialog,
	Field,
	Row,
	Stack,
	Text,
	Toggle,
} from "../design-system";
import { memberName } from "../domain/app-rules";
import type { CoachingFeedback } from "../domain/app-types";
import { clubDate } from "../domain/event-time";
import { ConfirmButton } from "./confirm-button";
import { useDraft } from "./use-draft";
import { useFormTask } from "./use-form-task";

export const FeedbackEditor = ({
	personId,
	eventId,
	existing,
	isOpen: controlledOpen,
	onOpenChange,
}: {
	personId: string;
	eventId?: string;
	existing?: CoachingFeedback;
} & (
	| { isOpen: boolean; onOpenChange: (open: boolean) => void }
	| { isOpen?: undefined; onOpenChange?: undefined }
)): ReactElement => {
	const { account, data, dispatch, source } = useApp();
	const { busy: dispatchBusy } = useAppStatus();
	const task = useFormTask();
	const busy = dispatchBusy || task.busy;
	const [localOpen, setLocalOpen] = useState(false);
	const open = controlledOpen ?? localOpen;
	const setOpen = (value: boolean): void => {
		setLocalOpen(value);
		onOpenChange?.(value);
	};
	const [privateNote, setPrivateNote] = useState(
		existing?.visibility === "private",
	);
	const [body, setBody] = useDraft(
		`feedback:${source}:${account.id}:${personId}:${existing?.id ?? "new"}${eventId ? `:${eventId}` : ""}`,
	);
	const attempt = useRef<string | undefined>(undefined);
	const save = async (
		visibility: CoachingFeedback["visibility"],
	): Promise<boolean> =>
		task.submit(
			() =>
				!body.trim()
					? "Add feedback"
					: body.length > 10000
						? "Keep feedback to 10,000 characters"
						: undefined,
			async (): Promise<void> => {
				const id = existing?.id ?? attempt.current ?? newId();
				attempt.current = id;
				const saved = await dispatch({
					type: "save-feedback",
					feedback: {
						id,
						kind: "coaching",
						personId,
						authorId: account.id,
						eventId: existing?.eventId ?? eventId,
						body,
						visibility,
						date:
							existing?.date ??
							data.events.find((event) => event.id === eventId)?.date ??
							clubDate(Date.now(), data.timeZone),
					},
				});
				if (!saved) throw new Error("Couldn’t save feedback. Try again.");
				setBody("");
				setOpen(false);
				attempt.current = undefined;
			},
		);
	return (
		<>
			{controlledOpen === undefined ? (
				<Button
					compact
					label={existing ? "Edit note" : "Add note"}
					prefix={existing ? "edit" : "plus"}
					variant="secondary"
					onPress={(): void => {
						task.clear();
						if (existing) setBody(existing.body);
						setOpen(true);
					}}
				/>
			) : undefined}
			<Dialog
				intent="form"
				isDismissDisabled={busy}
				title={`Coach note for ${memberName(data, personId)}`}
				isOpen={open}
				onOpenChange={(value): void => {
					if (!busy) setOpen(value);
				}}
				footer={
					<Row>
						{!privateNote ? (
							<Button
								label="Save draft"
								variant="ghost"
								isDisabled={busy}
								onPress={(): void => {
									void save("draft");
								}}
							/>
						) : undefined}
						{privateNote ? (
							<Button
								label="Save note"
								isLoading={busy}
								onPress={(): void => {
									void save("private");
								}}
							/>
						) : (
							<ConfirmButton
								label="Publish"
								title="Publish feedback?"
								description={`Share with ${memberName(data, personId)} and linked parents. Published feedback can’t be edited or deleted.`}
								confirmLabel="Publish feedback"
								isDisabled={busy}
								onConfirm={(): Promise<boolean> => save("published")}
							/>
						)}
					</Row>
				}
			>
				<Stack>
					<Field
						label="Feedback"
						value={body}
						onValueChange={setBody}
						multiline
						maxLength={10000}
						isDisabled={busy}
					/>
					<Toggle
						label="Private coach note"
						value={privateNote}
						onValueChange={setPrivateNote}
						isDisabled={busy || existing?.visibility === "private"}
					/>
					<Text variant="caption" tone="secondary">
						{privateNote
							? "Coaches only"
							: `Publishes to ${memberName(data, personId)} and linked parents.`}
					</Text>
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
