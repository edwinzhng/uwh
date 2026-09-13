import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useChatSafety } from "../backend/chat-safety";
import { useMessaging } from "../backend/messaging-context";
import { useApp } from "../demo/app-state";
import { Button, Combobox, Dialog, Stack, Text } from "../design-system";
import { ClubShell } from "./club-shell";
import { ConversationList } from "./conversation-list";
import { NoticeBanner } from "./notice-banner";
import { useFormTask } from "./use-form-task";

export const MessagesScreen = (): ReactElement => {
	const router = useRouter();
	const { account, accounts } = useApp();
	const messaging = useMessaging();
	const safety = useChatSafety();
	const task = useFormTask();
	const [compose, setCompose] = useState(false);
	const [recipient, setRecipient] = useState<string>();
	const save = async (): Promise<void> => {
		await task.submit(
			() => (!recipient ? "Choose a recipient." : undefined),
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
			}
		>
			<NoticeBanner />
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
						isLoading={task.busy}
						onPress={(): void => {
							void save();
						}}
					/>
				}
			>
				<Stack>
					<Combobox
						label="To"
						isDisabled={task.busy}
						value={recipient}
						onValueChange={setRecipient}
						options={accounts
							.filter(
								(entry) =>
									entry.id !== account.id &&
									!safety.status?.unavailableIds.includes(entry.id),
							)
							.map((entry) => ({ value: entry.id, label: entry.name }))}
						placeholder="Find a club account"
					/>
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
