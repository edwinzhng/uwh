import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useChatSafety } from "../backend/chat-safety";
import { newId, useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	EmptyState,
	Field,
	List,
	ListItem,
	LoadingContent,
	PersonChoice,
	Stack,
	Text,
} from "../design-system";
import type { Conversation } from "../domain/app-types";
import {
	canEditChatAppearance,
	canRenameChat,
} from "../domain/chat-appearance";
import { recipientPersonId } from "../domain/message-recipients";
import { ChatAppearanceEditor } from "./chat-appearance-editor";
import { ChatNameEditor } from "./chat-name-editor";
import { useFormTask } from "./use-form-task";
import {
	type ParticipantControls,
	useLiveThreadParticipants,
	usePreviewThreadParticipants,
} from "./use-thread-participants";

const ParticipantsContent = ({
	controls,
	thread,
	onClose,
}: {
	controls: ParticipantControls;
	onClose: () => void;
	thread: Conversation;
}): ReactElement => {
	const { state } = controls;
	const router = useRouter();
	const task = useFormTask();
	const [view, setView] = useState<"members" | "add" | "picture" | "name">(
		"members",
	);
	const { account } = useApp();
	const safety = useChatSafety();
	const [selected, setSelected] = useState<string[]>([]);
	const [search, setSearch] = useState("");
	const [groupId, setGroupId] = useState(() => `group-${newId()}`);
	const candidates =
		state?.candidates.filter((candidate) =>
			candidate.name.toLowerCase().includes(search.trim().toLowerCase()),
		) ?? [];
	const save = async (): Promise<void> => {
		await task.submit(
			() => (!selected.length ? "Choose at least one person." : undefined),
			async (): Promise<void> => {
				const id = await controls.add(selected, groupId);
				onClose();
				setSelected([]);
				router.replace({ pathname: "/conversation", params: { id } });
			},
		);
	};
	return (
		<>
			<Dialog
				intent="detail"
				title="Conversation members"
				isOpen={view === "members"}
				onOpenChange={(open): void => {
					if (!open) onClose();
				}}
				footer={
					state?.canAdd ? (
						<Button
							label="Add people"
							onPress={(): void => {
								task.clear();
								setSelected([]);
								setSearch("");
								setGroupId(`group-${newId()}`);
								setView("add");
							}}
						/>
					) : undefined
				}
			>
				{!state ? (
					<LoadingContent />
				) : (
					<Stack>
						{canEditChatAppearance(thread, account) ? (
							<Button
								label="Chat picture"
								prefix="image"
								variant="secondary"
								isDisabled={safety.status?.paused}
								onPress={(): void => setView("picture")}
							/>
						) : undefined}
						{canRenameChat(thread, account) ? (
							<Button
								label="Chat name"
								prefix="edit"
								variant="secondary"
								onPress={(): void => setView("name")}
							/>
						) : undefined}
						<List>
							{state.members.map((member) => (
								<ListItem
									key={member.id}
									title={member.name}
									avatar={member.name}
									avatarId={recipientPersonId(member.id)}
								/>
							))}
							{!state.members.length ? (
								<EmptyState title="No members available" />
							) : undefined}
						</List>
					</Stack>
				)}
			</Dialog>
			{view === "name" ? (
				<ChatNameEditor thread={thread} onClose={onClose} />
			) : undefined}
			{view === "picture" ? (
				<ChatAppearanceEditor thread={thread} onClose={(): void => onClose()} />
			) : undefined}
			<Dialog
				intent="picker"
				isDismissDisabled={task.busy}
				title={state?.kind === "direct" ? "Start a group" : "Add people"}
				isOpen={view === "add"}
				onOpenChange={(open): void => {
					if (!open && !task.busy) onClose();
				}}
				footer={
					<Button
						label={
							state?.kind === "direct" ? "Create group" : "Add selected people"
						}
						isLoading={task.busy}
						onPress={(): void => {
							void save();
						}}
					/>
				}
			>
				<Stack>
					<Text>
						{state?.kind === "direct"
							? "This creates a new group. Your direct conversation stays private and its earlier messages won’t be copied."
							: "People you add can read the existing messages in this group."}
					</Text>
					<Field
						label="Find people"
						value={search}
						onValueChange={setSearch}
						isDisabled={task.busy}
					/>
					<List>
						{candidates.map((candidate) => (
							<PersonChoice
								key={candidate.id}
								name={candidate.name}
								personId={recipientPersonId(candidate.id)}
								checked={selected.includes(candidate.id)}
								isDisabled={task.busy}
								onChange={(checked): void =>
									setSelected((current) =>
										checked
											? [...new Set([...current, candidate.id])]
											: current.filter((id) => id !== candidate.id),
									)
								}
							/>
						))}
						{!candidates.length ? (
							<EmptyState
								title="No people found"
								description={
									search.trim()
										? "Try another name or clear your search."
										: "Everyone available is already in this conversation."
								}
							/>
						) : undefined}
					</List>
					{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
				</Stack>
			</Dialog>
		</>
	);
};
const LiveParticipants = ({
	thread,
	onClose,
}: {
	thread: Conversation;
	onClose: () => void;
}): ReactElement => (
	<ParticipantsContent
		thread={thread}
		onClose={onClose}
		controls={useLiveThreadParticipants(thread)}
	/>
);
const PreviewParticipants = ({
	thread,
	onClose,
}: {
	thread: Conversation;
	onClose: () => void;
}): ReactElement => (
	<ParticipantsContent
		thread={thread}
		onClose={onClose}
		controls={usePreviewThreadParticipants(thread)}
	/>
);
const ParticipantsDialog = ({
	thread,
	onClose,
}: {
	thread: Conversation;
	onClose: () => void;
}): ReactElement =>
	useApp().source === "convex" ? (
		<LiveParticipants thread={thread} onClose={onClose} />
	) : (
		<PreviewParticipants thread={thread} onClose={onClose} />
	);

export const ThreadParticipantsHeader = ({
	thread,
}: {
	thread: Conversation;
}): ReactElement => {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button
				label="Conversation info"
				icon="users"
				variant="ghost"
				onPress={(): void => setOpen(true)}
			/>
			{open ? (
				<ParticipantsDialog
					thread={thread}
					onClose={(): void => setOpen(false)}
				/>
			) : undefined}
		</>
	);
};
