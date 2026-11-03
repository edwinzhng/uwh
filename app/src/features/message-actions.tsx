import { type ReactElement, type ReactNode, useState } from "react";
import { useChatSafety } from "../backend/chat-safety";
import { useThreadTools } from "../backend/thread-tools-context";
import { useApp } from "../demo/app-state";
import {
	Button,
	ContextActionMenu,
	type ContextMenuControls,
	Dialog,
	Field,
	type MenuGroup,
	Stack,
	Text,
	Toggle,
} from "../design-system";
import type { Message } from "../domain/app-types";
import { hasVisibleMessageContent } from "../domain/message-content";
import * as Clipboard from "../platform/clipboard";
import { ConfirmationDialog } from "./confirmation-dialog";
import type { MessageReactionControls } from "./use-message-reaction";
import { useTask } from "./use-task";

export const MessageActions = ({
	message,
	onReply,
	reaction,
	children,
}: {
	message: Message;
	onReply: () => void;
	reaction: MessageReactionControls;
	children: (controls: ContextMenuControls) => ReactNode;
}): ReactElement => {
	const { account, dispatch } = useApp();
	const safety = useChatSafety();
	const tools = useThreadTools();
	const task = useTask();
	const [reporting, setReporting] = useState(false);
	const [reason, setReason] = useState("");
	const [blockAuthor, setBlockAuthor] = useState(false);
	const [blocking, setBlocking] = useState(false);
	const [mode, setMode] = useState<"edit" | "delete">();
	const [body, setBody] = useState(message.body);
	const [busy, setBusy] = useState(false);
	const [copyState, setCopyState] = useState<string>();
	const copy = async (): Promise<void> => {
		try {
			setCopyState(
				(await Clipboard.setStringAsync(message.body))
					? "Copied"
					: "Couldn’t copy",
			);
		} catch {
			setCopyState("Couldn’t copy");
		}
	};
	const save = async (): Promise<void> => {
		if (busy || !mode) return;
		setBusy(true);
		const ok = await dispatch(
			mode === "edit"
				? { type: "edit-message", messageId: message.id, body }
				: { type: "delete-message", messageId: message.id },
		);
		if (ok) setMode(undefined);
		setBusy(false);
	};
	const groups: MenuGroup[] = [
		...(safety.available && message.accountId !== account.id
			? [
					{
						id: "safety",
						items: [
							{
								id: "report",
								label: "Report message",
								icon: "shield" as const,
								onSelect: (): void => {
									setReporting(true);
									setReason("");
									setBlockAuthor(false);
									task.clear();
								},
							},
							{
								id: "block",
								label: "Block account",
								icon: "lock" as const,
								onSelect: (): void => {
									setBlocking(true);
								},
							},
						],
					},
				]
			: []),
		{
			id: "message",
			items: [
				{
					id: "reaction",
					label: "Add reaction",
					icon: "reaction",
					onSelect: (): void => {
						reaction.open();
					},
				},
				{ id: "reply", label: "Reply", icon: "reply", onSelect: onReply },
				...(tools?.canPin
					? [
							{
								id: "pin",
								icon: "pin" as const,
								label: tools.pins.some((pin) => pin.id === message.id)
									? "Unpin message"
									: "Pin message",
								onSelect: (): void => {
									void task.run(() =>
										tools.pin(
											message.id,
											!tools.pins.some((pin) => pin.id === message.id),
										),
									);
								},
							},
						]
					: []),
				...(message.body
					? [
							{
								id: "copy",
								label: "Copy text",
								icon: "copy" as const,
								onSelect: (): void => {
									void copy();
								},
							},
						]
					: []),
			],
		},
		...(message.accountId === account.id
			? [
					{
						id: "own",
						items: [
							...(!message.pollId
								? [
										{
											id: "edit",
											label: "Edit",
											icon: "edit" as const,
											onSelect: (): void => {
												setBody(message.body);
												setMode("edit");
											},
										},
									]
								: []),
							{
								id: "delete",
								label: "Delete",
								icon: "trash" as const,
								tone: "danger" as const,
								onSelect: (): void => setMode("delete"),
							},
						],
					},
				]
			: []),
	];
	return (
		<>
			{blocking ? (
				<ConfirmationDialog
					title="Block account?"
					description="Hide their messages and stop direct messages. You can unblock them in Settings."
					confirmLabel="Block"
					danger
					onClose={(): void => setBlocking(false)}
					onConfirm={async (): Promise<void> => {
						if (!safety.block) throw new Error("Account unavailable");
						await safety.block(message.accountId, true);
					}}
				/>
			) : undefined}

			<Dialog
				intent="form"
				isDismissDisabled={task.busy}
				title="Report message"
				isOpen={reporting}
				onOpenChange={(open): void => {
					if (!task.busy) setReporting(open);
				}}
				footer={
					<Button
						label="Send report"
						isLoading={task.busy}
						validationError={!reason.trim() ? "Add a reason" : undefined}
						onPress={(): void => {
							void task.run(async (): Promise<void> => {
								await safety.report?.(message.id, reason, blockAuthor);
								setReporting(false);
								setCopyState("Report sent");
							});
						}}
					/>
				}
			>
				<Stack>
					<Text variant="small">
						Club admins will receive this message and its photos.
					</Text>
					<Field
						label="Reason"
						value={reason}
						onValueChange={setReason}
						multiline
						maxLength={1000}
					/>
					<Toggle
						label="Also block this account"
						description="Hide their messages and stop direct messages."
						value={blockAuthor}
						onValueChange={setBlockAuthor}
					/>
					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
				</Stack>
			</Dialog>
			{task.error && !reporting ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
			<ContextActionMenu
				label="Message actions"
				groups={groups}
				isDisabled={busy || task.busy || reaction.pending}
			>
				{children}
			</ContextActionMenu>
			{copyState ? (
				<Text variant="caption" tone="secondary">
					{copyState}
				</Text>
			) : undefined}
			<Dialog
				intent={mode === "edit" ? "form" : "confirmation"}
				isDismissDisabled={busy}
				isOpen={Boolean(mode)}
				onOpenChange={(open): void => {
					if (!open && !busy) setMode(undefined);
				}}
				title={mode === "edit" ? "Edit message" : "Delete message?"}
				footer={
					<Button
						label={mode === "edit" ? "Save" : "Delete"}
						variant={mode === "edit" ? "solid" : "danger"}
						isLoading={busy}
						validationError={
							mode === "edit" &&
							!hasVisibleMessageContent(body) &&
							!message.images?.length
								? "Write a message"
								: body.length > 5000
									? "Use 5,000 characters or fewer"
									: undefined
						}
						onPress={(): void => {
							void save();
						}}
					/>
				}
			>
				{mode === "edit" ? (
					<Field
						label="Message"
						value={body}
						onValueChange={setBody}
						multiline
						maxLength={5000}
						isDisabled={busy}
					/>
				) : (
					<Text variant="small">
						Remove this message and its photos for everyone?
					</Text>
				)}
			</Dialog>
		</>
	);
};
