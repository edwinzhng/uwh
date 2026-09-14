import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { newId, useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	EmptyState,
	Field,
	List,
	ListItem,
	LoadingContent,
	Stack,
	Text,
	Toggle,
} from "../design-system";
import type { Conversation } from "../domain/app-types";
import { useFormTask } from "./use-form-task";
import {
	type ParticipantControls,
	useLiveThreadParticipants,
	usePreviewThreadParticipants,
} from "./use-thread-participants";

const ParticipantsContent = ({
	controls,
}: {
	controls: ParticipantControls;
}): ReactElement => {
	const { state } = controls;
	const router = useRouter();
	const task = useFormTask();
	const [view, setView] = useState<"members" | "add">();
	const [selected, setSelected] = useState<string[]>([]);
	const [search, setSearch] = useState("");
	const [groupId, setGroupId] = useState(() => `group-${newId()}`);
	const names = state?.members
		.slice(0, 2)
		.map((member) => member.name)
		.join(", ");
	const label = names
		? `${names}${(state?.members.length ?? 0) > 2 ? ` +${(state?.members.length ?? 0) - 2}` : ""}`
		: "View members";
	const candidates =
		state?.candidates.filter((candidate) =>
			candidate.name.toLowerCase().includes(search.trim().toLowerCase()),
		) ?? [];
	const save = async (): Promise<void> => {
		await task.submit(
			() => (!selected.length ? "Choose at least one person." : undefined),
			async (): Promise<void> => {
				const id = await controls.add(selected, groupId);
				setView(undefined);
				setSelected([]);
				router.replace({ pathname: "/conversation", params: { id } });
			},
		);
	};
	return (
		<>
			<Button
				label={label}
				prefix="users"
				accessibilityLabel={`${state?.members.length ?? 0} conversation ${state?.members.length === 1 ? "member" : "members"}. View all members`}
				variant="ghost"
				onPress={(): void => setView("members")}
			/>
			<Dialog
				title="Conversation members"
				isOpen={view === "members"}
				onOpenChange={(open): void => {
					if (!open) setView(undefined);
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
						<List>
							{state.members.map((member) => (
								<ListItem
									key={member.id}
									title={member.name}
									avatar={member.name}
								/>
							))}
							{!state.members.length ? (
								<EmptyState
									title="No members available"
									description="Member details will appear here when they are available."
								/>
							) : undefined}
						</List>
						{state.kind === "general" ? (
							<Text tone="secondary">
								Everyone in the club belongs to General automatically.
							</Text>
						) : state.kind === "event" ? (
							<Text tone="secondary">
								Membership follows this event’s eligible players and club staff.
							</Text>
						) : undefined}
					</Stack>
				)}
			</Dialog>
			<Dialog
				title={state?.kind === "direct" ? "Start a group" : "Add people"}
				isOpen={view === "add"}
				onOpenChange={(open): void => {
					if (!open && !task.busy) setView(undefined);
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
							<Toggle
								key={candidate.id}
								label={candidate.name}
								value={selected.includes(candidate.id)}
								isDisabled={task.busy}
								onValueChange={(checked): void =>
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
}: {
	thread: Conversation;
}): ReactElement => (
	<ParticipantsContent controls={useLiveThreadParticipants(thread)} />
);
const PreviewParticipants = ({
	thread,
}: {
	thread: Conversation;
}): ReactElement => (
	<ParticipantsContent controls={usePreviewThreadParticipants(thread)} />
);
export const ThreadParticipantsHeader = ({
	thread,
}: {
	thread: Conversation;
}): ReactElement =>
	useApp().source === "convex" ? (
		<LiveParticipants thread={thread} />
	) : (
		<PreviewParticipants thread={thread} />
	);
