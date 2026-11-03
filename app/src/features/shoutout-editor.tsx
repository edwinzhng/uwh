import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	Disclosure,
	Field,
	GlassPanel,
	Row,
	Select,
	Stack,
	Text,
} from "../design-system";
import { eventAttendees, memberName } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { practiceEvent } from "../domain/event-types";
import { type ShoutoutCategory, shoutoutCategories } from "../domain/shoutouts";
import { ResourcePlayerPicker } from "./resource-player-picker";
import { useClubToday } from "./use-club-today";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";

export const ShoutoutEditor = ({
	personId,
	event,
	compact = false,
	floating = false,
}: {
	personId?: string;
	event?: ClubEvent;
	compact?: boolean;
	floating?: boolean;
}): ReactElement => {
	const { account, data, dispatch } = useApp();
	const today = useClubToday();
	const task = useFormTask();
	const choices = eventAttendees(data, event?.id ?? "");
	const members = (choices.length ? choices : data.members).filter(
		(member) => !member.archived && !member.mergedInto,
	);
	const [open, setOpen] = useState(false);
	const [targetId, setTargetId] = useState(personId ?? "");
	const [body, setBody] = useState("");
	const [targetName, setTargetName] = useState(
		members.find((member) => member.id === targetId)?.name ?? "",
	);
	const [category, setCategory] = useState<ShoutoutCategory>();
	const [practiceId, setPracticeId] = useState(event?.id ?? "");
	const [submission, setSubmission] = useState(0);
	const operationKey = useOperationKey();
	const practice =
		event ?? data.events.find((entry) => entry.id === practiceId);
	const save = async (): Promise<void> => {
		await task.submit(
			() =>
				!targetId || !category
					? "Choose a player and recognition category."
					: undefined,
			async (): Promise<void> => {
				const payload = {
					kind: "shoutout" as const,
					personId: targetId,
					authorId: account.id,
					eventId: practice?.id,
					body: body.trim(),
					category,
					visibility: "published" as const,
					date: practice?.date ?? today,
				};
				const saved = await dispatch({
					type: "save-feedback",
					feedback: {
						...payload,
						id: operationKey(JSON.stringify({ payload, submission })),
					},
				});
				if (!saved)
					throw new Error("Could not share this shoutout. Try again.");
				setBody("");
				setCategory(undefined);
				setSubmission((value) => value + 1);
				setOpen(false);
			},
		);
	};
	const trigger = (
		<Button
			label="Give shoutout"
			prefix="plus"
			variant={floating || compact ? "ghost" : "secondary"}
			compact={compact}
			round={floating}
			onPress={(): void => setOpen(true)}
		/>
	);
	return (
		<>
			{floating ? (
				<GlassPanel padding="xs" shape="pill" interactive>
					{trigger}
				</GlassPanel>
			) : (
				trigger
			)}
			<Dialog
				intent="form"
				isDismissDisabled={task.busy}
				title="Give a shoutout"
				isOpen={open}
				onOpenChange={(value): void => {
					if (!task.busy) setOpen(value);
				}}
				footer={
					<Row>
						<Button
							label="Send shoutout"
							isLoading={task.busy}
							onPress={(): void => {
								void save();
							}}
						/>
					</Row>
				}
			>
				<Stack>
					<Text variant="small" tone="secondary">
						Only the recipient and their linked household can see this. Your
						name stays anonymous.
					</Text>
					{personId ? undefined : (
						<Stack gap="xs">
							{targetId ? (
								<Text variant="label">
									For {targetName || "selected player"}
								</Text>
							) : undefined}
							<ResourcePlayerPicker
								label="Find a teammate"
								actionLabel="Choose"
								selected={targetId ? [targetId] : []}
								disabled={task.busy}
								onSelect={(id, name): void => {
									setTargetId(id);
									setTargetName(name);
								}}
							/>
						</Stack>
					)}
					<Select
						label="Recognition"
						value={category ?? ""}
						options={[
							{ value: "", label: "Choose recognition" },
							...shoutoutCategories,
						]}
						isDisabled={task.busy}
						onValueChange={(value): void =>
							setCategory(
								shoutoutCategories.find((entry) => entry.value === value)
									?.value,
							)
						}
					/>
					<Disclosure
						title="Add a note or practice"
						summary={body || practiceId ? "Optional details added" : undefined}
						isDisabled={task.busy}
					>
						{!event ? (
							<Select
								label="Practice (optional)"
								value={practiceId}
								options={[
									{ value: "", label: "No practice" },
									...data.events
										.filter((entry) => practiceEvent(entry) && !entry.cancelled)
										.map((entry) => ({
											value: entry.id,
											label: `${entry.date} · ${entry.title}`,
										})),
								]}
								isDisabled={task.busy}
								onValueChange={(value): void => setPracticeId(value ?? "")}
							/>
						) : undefined}
						<Field
							label={
								personId
									? `Note for ${memberName(data, personId)} (optional)`
									: "Note (optional)"
							}
							placeholder="What did they do well?"
							value={body}
							onValueChange={setBody}
							multiline
							rows={4}
							maxLength={1000}
							isDisabled={task.busy}
						/>
					</Disclosure>
					{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
				</Stack>
			</Dialog>
		</>
	);
};
