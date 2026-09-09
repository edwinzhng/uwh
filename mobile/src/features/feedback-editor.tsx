import { type ReactElement, useRef, useState } from "react";
import { newId, useApp } from "../demo/app-state";
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
import { useDraft } from "./use-draft";

export const FeedbackEditor = ({
	personId,
	existing,
}: {
	personId: string;
	existing?: CoachingFeedback;
}): ReactElement => {
	const { account, data, dispatch, busy, source } = useApp();
	const [open, setOpen] = useState(false);
	const [privateNote, setPrivateNote] = useState(
		existing?.visibility === "private",
	);
	const [body, setBody] = useDraft(
		`feedback:${source}:${account.id}:${personId}:${existing?.id ?? "new"}`,
	);
	const attempt = useRef<string | undefined>(undefined);
	const save = async (
		visibility: CoachingFeedback["visibility"],
	): Promise<void> => {
		const id = existing?.id ?? attempt.current ?? newId();
		attempt.current = id;
		if (
			await dispatch({
				type: "save-feedback",
				feedback: {
					id,
					personId,
					authorId: account.id,
					body,
					visibility,
					date: existing?.date ?? new Date().toISOString().slice(0, 10),
				},
			})
		) {
			setBody("");
			setOpen(false);
			attempt.current = undefined;
		}
	};
	return (
		<>
			<Button
				staffRole={existing ? undefined : "coach"}
				label={existing ? "Edit" : "Feedback"}
				prefix={existing ? "edit" : "plus"}
				variant="secondary"
				onPress={(): void => {
					if (existing) setBody(existing.body);
					setOpen(true);
				}}
			/>
			<Dialog
				staffRole="coach"
				title={`Feedback for ${memberName(data, personId)}`}
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
								isDisabled={busy || !body.trim()}
								onPress={(): void => {
									void save("draft");
								}}
							/>
						) : undefined}
						<Button
							label={privateNote ? "Save note" : "Publish"}
							isLoading={busy}
							isDisabled={!body.trim()}
							onPress={(): void => {
								void save(privateNote ? "private" : "published");
							}}
						/>
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
				</Stack>
			</Dialog>
		</>
	);
};
