import * as Clipboard from "expo-clipboard";
import { type ReactElement, useState } from "react";
import { useChatSafety } from "../backend/chat-safety";
import { useApp } from "../demo/app-state";
import {
	ActionMenu,
	Button,
	Dialog,
	Field,
	type MenuGroup,
	Stack,
	Text,
	Toggle,
} from "../design-system";
import type { Message } from "../domain/app-types";
import { useTask } from "./use-task";

export const MessageActions = ({
	message,
	onReply,
}: {
	message: Message;
	onReply: () => void;
}): ReactElement => {
	const { account, dispatch } = useApp();
	const safety = useChatSafety();
	const task = useTask();
	const [reporting, setReporting] = useState(false);
	const [reason, setReason] = useState("");
	const [blockAuthor, setBlockAuthor] = useState(false);
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
								onSelect: (): void => {
									void task.run(async (): Promise<void> => {
										await safety.block?.(message.accountId, true);
									});
								},
							},
						],
					},
				]
			: []),
		{
			id: "message",
			items: [
				{ id: "reply", label: "Reply", icon: "reply", onSelect: onReply },
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
							{
								id: "edit",
								label: "Edit",
								icon: "edit" as const,
								onSelect: (): void => {
									setBody(message.body);
									setMode("edit");
								},
							},
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
			<Dialog
				title="Report message"
				isOpen={reporting}
				onOpenChange={(open): void => {
					if (!task.busy) setReporting(open);
				}}
				footer={
					<Button
						label="Send report"
						isLoading={task.busy}
						validationError={
							!reason.trim() ? "Check the required fields" : undefined
						}
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
			<Stack gap="xxs">
				<ActionMenu
					label="Message actions"
					icon="more"
					groups={groups}
					isDisabled={busy}
				/>
				{copyState ? (
					<Text variant="caption" tone="secondary">
						{copyState}
					</Text>
				) : undefined}
			</Stack>
			<Dialog
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
							((!body.trim() && !message.images?.length) || body.length > 5000)
								? "Check the required fields"
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
