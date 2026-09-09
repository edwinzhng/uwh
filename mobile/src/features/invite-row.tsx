import type { FunctionReturnType } from "convex/server";
import * as Clipboard from "expo-clipboard";
import { type ReactElement, useState } from "react";
import type { api } from "../../convex/_generated/api";
import { useBackend } from "../backend/context";
import {
	ActionMenu,
	Badge,
	ListItem,
	Row,
	Stack,
	Text,
} from "../design-system";
import { ConfirmationDialog } from "./confirmation-dialog";
import { useTask } from "./use-task";

type Invite = FunctionReturnType<typeof api.invites.list>["page"][number];

export const InviteRow = ({ invite }: { invite: Invite }): ReactElement => {
	const { invites } = useBackend();
	const task = useTask();
	const [revoking, setRevoking] = useState(false);
	const [copied, setCopied] = useState(false);
	const pending = invite.state === "pending" || invite.state === "expired";
	const status =
		invite.state === "pending"
			? {
					queued: "Sending",
					sent: "Sent",
					local: "Local preview",
					failed: "Send failed",
				}[invite.delivery]
			: {
					accepted: "Joined",
					revoked: "Revoked",
					expired: "Expired",
					replaced: "Replaced",
				}[invite.state];
	const manage = (action: "resend" | "revoke"): void => {
		setCopied(false);
		void task.run(async (): Promise<void> => {
			if (!invites) throw new Error("Connect to the club to manage invites.");
			await invites[action](invite.id);
		});
	};
	return (
		<Stack gap="xxs">
			{revoking ? (
				<ConfirmationDialog
					title="Revoke invite?"
					description={`The invite link sent to ${invite.email} will stop working.`}
					confirmLabel="Revoke invite"
					danger
					onClose={(): void => setRevoking(false)}
					onConfirm={async (): Promise<void> => {
						if (!invites) throw new Error("Connect to the club first.");
						await invites.revoke(invite.id);
					}}
				/>
			) : undefined}
			<ListItem
				title={invite.name}
				description={invite.email}
				descriptionLines={1}
				trailing={
					<Row gap="xs">
						<Badge
							label={status}
							kind={
								invite.state === "accepted"
									? "success"
									: invite.delivery === "failed"
										? "danger"
										: "neutral"
							}
						/>
						{pending ? (
							<ActionMenu
								icon="more"
								label={`Invite actions for ${invite.email}`}
								isDisabled={task.busy}
								groups={[
									{
										id: "invite",
										items: [
											...(invite.state === "pending"
												? [
														{
															id: "copy",
															label: "Copy invite link",
															onSelect: (): void => {
																void task.run(async (): Promise<void> => {
																	await Clipboard.setStringAsync(invite.url);
																	setCopied(true);
																});
															},
														},
													]
												: []),
											{
												id: "resend",
												label: "Resend",
												onSelect: (): void => manage("resend"),
											},
											{
												id: "revoke",
												label: "Revoke",
												tone: "danger",
												onSelect: (): void => setRevoking(true),
											},
										],
									},
								]}
							/>
						) : undefined}
					</Row>
				}
			/>
			{task.error || copied ? (
				<Text variant="caption" tone={task.error ? "danger" : "secondary"}>
					{task.error ?? "Link copied"}
				</Text>
			) : undefined}
		</Stack>
	);
};
