import { type ReactElement, useRef, useState } from "react";
import { newId, useApp, useAppStatus } from "../demo/app-state";
import { Button, Dialog, Field, Row, Stack, Text } from "../design-system";
import { memberName } from "../domain/app-rules";
import type { CoachingFeedback } from "../domain/app-types";
import { clubDate } from "../domain/event-time";
import { feedbackAudienceLabel } from "../domain/feedback-audience";
import { ConfirmButton } from "./confirm-button";
import { FeedbackAudience } from "./feedback-audience";
import { useDraft } from "./use-draft";
import { useFormTask } from "./use-form-task";

export const FeedbackEditor = ({
	personId,
	collapseLabelOnNarrow,
	eventId,
	existing,
	isOpen: controlledOpen,
	onOpenChange,
}: {
	personId: string;
	collapseLabelOnNarrow?: boolean;
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
	const privateNote = existing?.visibility === "private";
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
					collapseLabelOnNarrow={collapseLabelOnNarrow}
					label={existing ? "Edit feedback" : "Add feedback"}
					accessibilityLabel={`${existing ? "Edit" : "Add"} feedback for ${memberName(data, personId)}`}
					roleTone="coach"
					prefix={existing ? "edit" : "plus"}
					variant="secondary"
					onPress={(): void => {
						task.clear();
						if (existing) setBody(existing.body);
						setOpen(true);
					}}
				/>
			) : undefined}
			<FeedbackAudience personId={personId} enabled={open && !privateNote}>
				{(names) => {
					const audience = names ? feedbackAudienceLabel(names) : undefined;
					return (
						<Dialog
							intent="form"
							isDismissDisabled={busy}
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
											isDisabled={busy}
											onPress={(): void => {
												void save("draft");
											}}
										/>
									) : undefined}
									{privateNote ? (
										<Button
											label="Save feedback"
											isLoading={busy}
											onPress={(): void => {
												void save("private");
											}}
										/>
									) : (
										<ConfirmButton
											label="Publish"
											title="Publish feedback?"
											description={`Share with ${audience ?? memberName(data, personId)}. Published feedback can’t be edited or deleted.`}
											confirmLabel="Publish feedback"
											isDisabled={busy || !names?.length}
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
								<Text variant="caption" tone="secondary">
									{privateNote
										? "Coaches only"
										: audience
											? `Publishes to ${audience}.`
											: "Loading recipients…"}
								</Text>
								{task.error ? (
									<Text variant="small" tone="danger">
										{task.error}
									</Text>
								) : undefined}
							</Stack>
						</Dialog>
					);
				}}
			</FeedbackAudience>
		</>
	);
};
