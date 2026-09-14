import { type ReactElement, useRef, useState } from "react";
import { newId, useApp } from "../demo/app-state";
import { Button, Field, IconButton, Row, Stack, Text } from "../design-system";
import type { Message } from "../domain/app-types";
import { imageLimits } from "../domain/messaging";
import { MessagePhoto } from "./message-photo";
import { MessageQuote } from "./message-quote";
import { useDictation } from "./use-dictation";
import { useDraft } from "./use-draft";
import { usePhotoDraft } from "./use-photo-draft";

export const MessageComposer = ({
	threadId,
	replyToId,
	reply,
	onClearReply,
}: {
	threadId: string;
	replyToId?: string;
	reply?: Message;
	onClearReply: () => void;
}): ReactElement => {
	const { account, dispatch, source } = useApp();
	const [draft, setDraft] = useDraft(
		`message:${source}:${account.id}:${threadId}`,
	);
	const dictation = useDictation(draft, setDraft);
	const dictating = dictation.phase !== "idle";
	const working = useRef(false);
	const photos = usePhotoDraft(threadId);
	const [sending, setSending] = useState(false);
	const attempt = useRef<{ id: string; payload: string } | undefined>(
		undefined,
	);
	const send = async (): Promise<void> => {
		if (
			working.current ||
			dictating ||
			photos.pending ||
			draft.length > 5000 ||
			(!draft.trim() && !photos.photos.length)
		)
			return;
		working.current = true;
		setSending(true);
		const payload = JSON.stringify({ draft, photos: photos.photos, replyToId });
		const id =
			attempt.current?.payload === payload ? attempt.current.id : newId();
		attempt.current = { id, payload };
		if (
			await dispatch({
				type: "send-message",
				id,
				threadId,
				body: draft,
				images: photos.photos,
				replyToId,
				time: new Intl.DateTimeFormat("en-CA", {
					hour: "numeric",
					minute: "2-digit",
				}).format(new Date()),
			})
		) {
			setDraft("");
			photos.clear();
			attempt.current = undefined;
			onClearReply();
		}
		setSending(false);
		working.current = false;
	};
	return (
		<Stack gap="sm">
			{replyToId ? (
				<Stack gap="xxs">
					<Row justify="between">
						<Text variant="caption" tone="secondary">
							Replying to {reply?.author ?? "message"}
						</Text>
						<IconButton
							label="Cancel reply"
							icon="close"
							onPress={onClearReply}
							isDisabled={sending}
						/>
					</Row>
					<MessageQuote message={reply} />
				</Stack>
			) : undefined}
			<Field
				label={`Message as ${account.name}`}
				value={draft}
				onValueChange={setDraft}
				placeholder="Write a message…"
				multiline
				rows={2}
				onSubmit={(): void => {
					void send();
				}}
				isDisabled={sending || dictating}
				maxLength={5000}
				focusKey={replyToId}
				error={
					draft.length > 5000
						? "Keep messages under 5,000 characters."
						: undefined
				}
			/>
			{dictating || dictation.error ? (
				<Text variant="caption" tone={dictation.error ? "danger" : "secondary"}>
					{dictation.error ??
						(dictation.phase === "starting"
							? "Connecting microphone…"
							: dictation.phase === "stopping"
								? "Finishing…"
								: "Listening… Tap stop when done.")}
				</Text>
			) : undefined}
			{photos.photos.length ? (
				<Row wrap align="start">
					{photos.photos.map((image) => (
						<MessagePhoto
							key={image.id}
							image={image}
							disabled={sending || photos.pending}
							onRemove={(): void => {
								void photos.remove(image.id);
							}}
						/>
					))}
				</Row>
			) : undefined}
			{photos.error ? (
				<Text variant="caption" tone="danger">
					{photos.error}
				</Text>
			) : undefined}
			<Row justify="between" gap="xs" wrap>
				<Row gap="xxs">
					<Button
						label="Photo"
						prefix="image"
						variant="ghost"
						isLoading={photos.pending}
						isDisabled={
							sending || photos.photos.length >= imageLimits.perMessage
						}
						onPress={(): void => {
							void photos.pick();
						}}
					/>
					<Button
						label={dictating ? "Stop dictation" : "Dictate message"}
						icon={dictating ? "stop" : "microphone"}
						variant={dictating ? "danger" : "ghost"}
						isDisabled={sending || dictation.phase === "stopping"}
						isSelected={dictating}
						onPress={dictating ? dictation.stop : dictation.start}
					/>
				</Row>
				<Button
					label="Send"
					prefix="arrowRight"
					isLoading={sending}
					validationError={
						photos.pending ||
						dictating ||
						draft.length > 5000 ||
						(!draft.trim() && !photos.photos.length)
							? "Check the required fields"
							: undefined
					}
					onPress={(): void => {
						void send();
					}}
				/>
			</Row>
		</Stack>
	);
};
