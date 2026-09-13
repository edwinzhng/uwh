import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useChatSafety } from "../backend/chat-safety";
import { useMessaging } from "../backend/messaging-context";
import { useApp } from "../demo/app-state";
import {
	Button,
	Combobox,
	Dialog,
	EmptyState,
	LoadingContent,
	Row,
	Stack,
	Text,
} from "../design-system";
import type { RecipientDirectory } from "../domain/message-recipients";
import { ClubShell } from "./club-shell";
import { ConversationList } from "./conversation-list";
import { NoticeBanner } from "./notice-banner";
import { NoticeComposer } from "./notice-composer";
import { useFormTask } from "./use-form-task";
import {
	useLiveMessageRecipients,
	usePreviewMessageRecipients,
} from "./use-message-recipients";

const MessagesContent = ({
	directory,
}: {
	directory?: RecipientDirectory;
}): ReactElement => {
	const router = useRouter();
	const { account } = useApp();
	const [noticeOpen, setNoticeOpen] = useState(false);

	const messaging = useMessaging();
	const safety = useChatSafety();
	const task = useFormTask();
	const [compose, setCompose] = useState(false);
	const [recipient, setRecipient] = useState<string>();
	const save = async (): Promise<void> => {
		await task.submit(
			() =>
				!recipient ||
				!directory?.recipients.some((entry) => entry.id === recipient)
					? "Choose an available recipient."
					: undefined,
			async (): Promise<void> => {
				if (!recipient) return;
				const id = await messaging.openDirect(recipient);
				setCompose(false);
				router.push({ pathname: "/conversation", params: { id } });
			},
		);
	};
	return (
		<ClubShell
			title="Messages"
			action={
				<Row gap="xs" wrap>
					{account.admin || account.coachPrograms.length > 0 ? (
						<Button
							label="New notice"
							variant="secondary"
							prefix="plus"
							onPress={(): void => setNoticeOpen(true)}
						/>
					) : undefined}
					<Button
						label="Message"
						isDisabled={Boolean(safety.status?.paused)}
						prefix="plus"
						onPress={(): void => {
							task.clear();
							setRecipient(undefined);
							setCompose(true);
						}}
					/>
				</Row>
			}
		>
			<NoticeBanner showCreate={false} />
			<NoticeComposer isOpen={noticeOpen} onOpenChange={setNoticeOpen} />
			<ConversationList />
			<Dialog
				title="New message"
				isOpen={compose}
				onOpenChange={(open): void => {
					if (!task.busy) setCompose(open);
				}}
				footer={
					<Button
						label="Open conversation"
						isDisabled={
							!recipient ||
							!directory?.recipients.some((entry) => entry.id === recipient)
						}
						isLoading={task.busy}
						onPress={(): void => {
							void save();
						}}
					/>
				}
			>
				<Stack>
					{!directory ? (
						<LoadingContent />
					) : directory.paused ? (
						<EmptyState
							title="Messaging is paused"
							description="Contact a club administrator about restoring your messaging access."
						/>
					) : directory.recipients.length ? (
						<Combobox
							label="To"
							isDisabled={task.busy}
							value={recipient}
							onValueChange={setRecipient}
							options={directory.recipients.map((entry) => ({
								value: entry.id,
								label: [
									entry.name,
									...entry.playerNames.filter((name) => name !== entry.name),
								].join(" · "),
							}))}
							placeholder="Find a member"
						/>
					) : (
						<EmptyState
							title="No members available"
							description="There are no other members you can message right now."
						/>
					)}

					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
				</Stack>
			</Dialog>
		</ClubShell>
	);
};

const LiveMessages = (): ReactElement => (
	<MessagesContent directory={useLiveMessageRecipients()} />
);
const PreviewMessages = (): ReactElement => (
	<MessagesContent directory={usePreviewMessageRecipients()} />
);
export const MessagesScreen = (): ReactElement =>
	useApp().source === "convex" ? <LiveMessages /> : <PreviewMessages />;
