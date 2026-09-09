import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useChatSafety } from "../backend/chat-safety";
import { useMessaging } from "../backend/messaging-context";
import { newId, useApp } from "../demo/app-state";
import {
	Button,
	Combobox,
	Dialog,
	Field,
	SegmentedControl,
	Stack,
	Text,
} from "../design-system";
import { ClubShell } from "./club-shell";
import { ConversationList } from "./conversation-list";
import { NoticeList } from "./notice-list";
import { useTask } from "./use-task";

export const MessagesScreen = (): ReactElement => {
	const params = useLocalSearchParams<{ tab?: string }>();
	const router = useRouter();
	const { account, accounts, dispatch, busy } = useApp();
	const tab = params.tab === "notices" ? "notices" : "chats";
	const messaging = useMessaging();
	const safety = useChatSafety();
	const task = useTask();
	const [compose, setCompose] = useState<"chat" | "notice">();
	const [recipient, setRecipient] = useState<string>();
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const canPost = account.admin || account.coachPrograms.length > 0;
	const save = async (): Promise<void> => {
		if (compose === "chat" && recipient) {
			await task.run(async (): Promise<void> => {
				const id = await messaging.openDirect(recipient);
				setCompose(undefined);
				router.push({ pathname: "/conversation", params: { id } });
			});
		} else if (compose === "notice") {
			if (
				await dispatch({
					type: "create-notice",
					notice: {
						id: newId(),
						title,
						body,
						program: "all",
						date: new Date().toISOString().slice(0, 10),
						acknowledgedBy: [],
					},
				})
			) {
				setCompose(undefined);
				setTitle("");
				setBody("");
			}
		}
	};
	return (
		<ClubShell
			title="Messages"
			action={
				tab === "chats" ? (
					<Button
						label="Message"
						isDisabled={Boolean(safety.status?.paused)}
						prefix="plus"
						onPress={(): void => {
							task.clear();
							setRecipient(undefined);
							setCompose("chat");
						}}
					/>
				) : canPost ? (
					<Button
						label="New notice"
						prefix="plus"
						onPress={(): void => setCompose("notice")}
					/>
				) : undefined
			}
		>
			<SegmentedControl
				label="Messages"
				hideLabel
				value={tab}
				onValueChange={(tab): void => router.setParams({ tab })}
				options={[
					{ value: "chats", label: "Chats" },
					{ value: "notices", label: "Notices" },
				]}
			/>
			{tab === "chats" ? <ConversationList /> : <NoticeList />}
			<Dialog
				staffRole={
					compose === "notice" ? (account.admin ? "admin" : "coach") : undefined
				}
				title={compose === "chat" ? "New message" : "New notice"}
				isOpen={Boolean(compose)}
				onOpenChange={(open): void => {
					if (!open && !task.busy && !busy) setCompose(undefined);
				}}
				footer={
					<Button
						label={compose === "chat" ? "Open conversation" : "Publish notice"}
						isDisabled={
							compose === "chat" ? !recipient : !title.trim() || !body.trim()
						}
						isLoading={busy || task.busy}
						onPress={(): void => {
							void save();
						}}
					/>
				}
			>
				{compose === "chat" ? (
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
				) : (
					<Stack>
						<Field
							label="Title"
							value={title}
							onValueChange={setTitle}
							placeholder="What’s new?"
						/>
						<Field
							label="Message"
							value={body}
							onValueChange={setBody}
							multiline
						/>
					</Stack>
				)}
			</Dialog>
		</ClubShell>
	);
};
