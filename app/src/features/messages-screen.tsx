import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useChatSafety } from "../backend/chat-safety";
import { useMessaging } from "../backend/messaging-context";
import { newId, useApp } from "../demo/app-state";
import {
	Button,
	ChatSidebar,
	Dialog,
	EmptyState,
	Field,
	LoadingContent,
	Row,
	Stack,
	Text,
} from "../design-system";
import {
	conversationDraftError,
	groupLimits,
} from "../domain/group-conversation";
import type { RecipientDirectory } from "../domain/message-recipients";
import { BlockedAccounts } from "./blocked-accounts";
import { ClubShell } from "./club-shell";
import { ConversationList } from "./conversation-list";
import { ConversationRecipients } from "./conversation-recipients";
import { useFormTask } from "./use-form-task";
import {
	useLiveMessageRecipients,
	usePreviewMessageRecipients,
} from "./use-message-recipients";
import { useReviewFlow } from "./use-review-flow";

const MessagesContent = ({
	directory,
	embedded = false,
}: {
	directory?: RecipientDirectory;
	embedded?: boolean;
}): ReactElement => {
	const router = useRouter();
	const messaging = useMessaging();
	const safety = useChatSafety();
	const task = useFormTask();
	const [compose, setCompose] = useState(
		useReviewFlow() === "new-conversation",
	);
	const [recipients, setRecipients] = useState<string[]>([]);
	const [name, setName] = useState("");
	const [blockedOpen, setBlockedOpen] = useState(false);
	const [groupId, setGroupId] = useState(() => `group-${newId()}`);
	const save = async (): Promise<void> => {
		await task.submit(
			() => conversationDraftError(recipients, name, directory),
			async (): Promise<void> => {
				const recipient = recipients.at(0);
				if (!recipient) return;
				const id =
					recipients.length > 1
						? await messaging.createGroup({
								groupId,
								name,
								recipientIds: recipients,
							})
						: await messaging.openDirect(recipient);
				setCompose(false);
				router.push({ pathname: "/conversation", params: { id } });
			},
		);
	};
	const content = (
		<>
			<ConversationList
				action={
					<Row gap="xs">
						{safety.status?.blocked.length ? (
							<Button
								label="Blocked accounts"
								icon="shield"
								variant="ghost"
								onPress={(): void => setBlockedOpen(true)}
							/>
						) : undefined}
						<Button
							label="New message"
							icon="edit"
							isDisabled={Boolean(safety.status?.paused)}
							onPress={(): void => {
								task.clear();
								setRecipients([]);
								setName("");
								setGroupId(`group-${newId()}`);
								setCompose(true);
							}}
						/>
					</Row>
				}
			/>
			<Dialog
				title="Blocked accounts"
				isOpen={blockedOpen}
				onOpenChange={setBlockedOpen}
				footer={false}
			>
				<BlockedAccounts />
			</Dialog>
			<Dialog
				title="New message"
				intent="form"
				isDismissDisabled={task.busy}
				isOpen={compose}
				onOpenChange={(open): void => {
					if (!task.busy) setCompose(open);
				}}
				footer={
					<Button
						label={recipients.length > 1 ? "Create group" : "Open conversation"}
						isDisabled={!directory || directory.paused}
						validationError={conversationDraftError(
							recipients,
							name,
							directory,
						)}
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
						<Stack>
							{recipients.length > 1 ? (
								<Field
									label="Group name"
									value={name}
									onValueChange={setName}
									isDisabled={task.busy}
									maxLength={groupLimits.name}
									onSubmit={(): void => {
										void save();
									}}
								/>
							) : undefined}
							<ConversationRecipients
								directory={directory}
								selected={recipients}
								onChange={setRecipients}
								disabled={task.busy}
							/>
						</Stack>
					) : (
						<EmptyState title="No members available" />
					)}

					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
				</Stack>
			</Dialog>
		</>
	);
	return embedded ? (
		<ChatSidebar>{content}</ChatSidebar>
	) : (
		<ClubShell title="Chats" presentation="workspace">
			{content}
		</ClubShell>
	);
};

const LiveMessages = ({ embedded }: { embedded?: boolean }): ReactElement => (
	<MessagesContent embedded={embedded} directory={useLiveMessageRecipients()} />
);
const PreviewMessages = ({
	embedded,
}: {
	embedded?: boolean;
}): ReactElement => (
	<MessagesContent
		embedded={embedded}
		directory={usePreviewMessageRecipients()}
	/>
);
export const MessagesScreen = ({
	embedded,
}: {
	embedded?: boolean;
}): ReactElement =>
	useApp().source === "convex" ? (
		<LiveMessages embedded={embedded} />
	) : (
		<PreviewMessages embedded={embedded} />
	);
