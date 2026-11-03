import { type ReactElement, useRef, useState } from "react";
import { newId, useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	EmojiPicker,
	Field,
	IconButton,
	MessageComposerSurface,
	RichMessageEditor,
	Row,
	Stack,
	Text,
} from "../design-system";
import type { Message } from "../domain/app-types";
import { hasVisibleMessageContent } from "../domain/message-content";
import { imageLimits } from "../domain/messaging";
import { ChatPollComposer } from "./chat-poll-composer";
import { MessageComposerMenu } from "./message-composer-menu";
import { MessagePhoto } from "./message-photo";
import { MessageQuote } from "./message-quote";
import { useDraft } from "./use-draft";
import { usePhotoDraft } from "./use-photo-draft";
import { useReviewFlow } from "./use-review-flow";

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
	const [emojiOpen, setEmojiOpen] = useState(false);
	const pendingEmoji = useRef<string | undefined>(undefined);
	const [emojiSearch, setEmojiSearch] = useState("");
	const [insertRequest, setInsertRequest] = useState<{
		id: string;
		text: string;
	}>();
	const [pollOpen, setPollOpen] = useState(useReviewFlow() === "poll-create");
	const [draft, setDraft] = useDraft(
		`message:${source}:${account.id}:${threadId}`,
	);
	const working = useRef(false);
	const photos = usePhotoDraft(threadId);
	const [sending, setSending] = useState(false);
	const [composing, setComposing] = useState(false);
	const [sendAttempted, setSendAttempted] = useState(false);
	const sendError =
		draft.length > 5000
			? "Use 5,000 characters or fewer"
			: !hasVisibleMessageContent(draft) && !photos.photos.length
				? "Add a message or photo"
				: undefined;
	const [editorResetKey, setEditorResetKey] = useState<string>();
	const [formatError, setFormatError] = useState<string>();
	const attempt = useRef<{ id: string; payload: string } | undefined>(
		undefined,
	);
	const send = async (): Promise<void> => {
		setSendAttempted(true);
		if (working.current || composing || photos.pending || sendError) return;
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
			setSendAttempted(false);
			setEditorResetKey(newId());
			setFormatError(undefined);
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
			<MessageComposerSurface
				leading={
					<MessageComposerMenu
						disabled={sending || composing || photos.pending}
						photoDisabled={photos.photos.length >= imageLimits.perMessage}
						onPhoto={(): void => {
							void photos.pick();
						}}
						onFile={(): void => {
							void photos.pickFile();
						}}
						onPoll={(): void => setPollOpen(true)}
					/>
				}
				accessory={
					<Button
						label="Add emoji"
						icon="smile"
						variant="ghost"
						isDisabled={sending || composing}
						onPress={(): void => {
							setEmojiSearch("");
							setEmojiOpen(true);
						}}
					/>
				}
				trailing={
					<Button
						label="Send"
						icon="arrowRight"
						round
						isLoading={sending}
						isDisabled={photos.pending || composing}
						validationError={sendError}
						onInvalid={(): void => setSendAttempted(true)}
						onPress={(): void => {
							void send();
						}}
					/>
				}
			>
				<Stack grow>
					<RichMessageEditor
						embedded
						label={`Message as ${account.name}`}
						value={draft}
						onValueChange={setDraft}
						placeholder="Write a message…"
						onSubmit={(): void => {
							void send();
						}}
						isDisabled={sending}
						maxLength={5000}
						focusKey={replyToId}
						resetKey={editorResetKey}
						insertRequest={insertRequest}
						onError={setFormatError}
						onCompositionChange={setComposing}
					/>
				</Stack>
			</MessageComposerSurface>
			{sendAttempted && sendError ? (
				<Text variant="caption" tone="danger">
					{sendError}
				</Text>
			) : undefined}
			<ChatPollComposer open={pollOpen} onOpenChange={setPollOpen} />
			<Dialog
				title="Emoji"
				intent="picker"
				isOpen={emojiOpen}
				onOpenChange={setEmojiOpen}
				onAfterClose={(): void => {
					const text = pendingEmoji.current;
					pendingEmoji.current = undefined;
					if (text) setInsertRequest({ id: newId(), text });
				}}
				footer={false}
			>
				<Stack gap="sm">
					<Field
						label="Find emoji"
						placeholder="Search emoji"
						value={emojiSearch}
						onValueChange={setEmojiSearch}
					/>
					{emojiOpen ? (
						<EmojiPicker
							search={emojiSearch}
							onSelect={(text): void => {
								pendingEmoji.current = text;
								setEmojiOpen(false);
							}}
						/>
					) : undefined}
				</Stack>
			</Dialog>
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
			{formatError && !(sendAttempted && sendError === formatError) ? (
				<Text variant="caption" tone="danger">
					{formatError}
				</Text>
			) : undefined}
		</Stack>
	);
};
