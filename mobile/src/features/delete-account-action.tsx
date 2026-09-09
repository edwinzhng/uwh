import { type ReactElement, useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { useBackend } from "../backend/context";
import { Button, Dialog, Field, Select, Stack, Text } from "../design-system";
import { useTask } from "./use-task";

import { VerifyAccount } from "./verify-account";

export const DeleteAccountAction = (): ReactElement | undefined => {
	const backend = useBackend();
	const user = backend.accountInfo;
	const task = useTask();
	const [open, setOpen] = useState(false);
	const [password, setPassword] = useState("");
	const [confirmed, setConfirmed] = useState("");
	const [transferTo, setTransferTo] = useState<Id<"users">>();
	if (!user) return undefined;
	const changeOpen = (value: boolean): void => {
		if (task.busy) return;
		setPassword("");
		setConfirmed("");
		setTransferTo(undefined);
		task.clear();
		setOpen(value);
	};
	return (
		<>
			<Button
				label="Delete account"
				variant="ghost"
				onPress={(): void => changeOpen(true)}
			/>
			<Dialog
				isOpen={open}
				onOpenChange={changeOpen}
				title="Delete account?"
				footer={
					<Button
						label="Delete account"
						variant="danger"
						isLoading={task.busy}
						isDisabled={
							confirmed !== "DELETE" ||
							(user.hasPassword
								? !password
								: !backend.social?.info?.reauthenticated) ||
							(user.mustTransfer && !transferTo)
						}
						onPress={(): void => {
							void task.run(async (): Promise<void> => {
								await backend.deleteAccount?.(
									user.hasPassword ? password : undefined,
									transferTo,
								);
								setPassword("");
								await backend.signOut?.();
							});
						}}
					/>
				}
			>
				<Stack>
					<Text variant="small">
						Your account, profile, messages, photos, attendance and personal
						records will be deleted. Linked children’s club profiles remain.
					</Text>
					<Text variant="small" tone="secondary">
						Published coaching feedback stays without your name. Moderation
						records expire after 90 days.
					</Text>
					{user.mustTransfer ? (
						<>
							<Select
								label="New club owner"
								isDisabled={task.busy}
								value={transferTo}
								onValueChange={(value): void =>
									setTransferTo(
										user.transferTargets.find((target) => target.id === value)
											?.id,
									)
								}
								options={user.transferTargets.map((target) => ({
									value: target.id,
									label: target.name,
								}))}
							/>
							{!user.transferTargets.length ? (
								<Text variant="small">
									Make another member an admin in Settings & access first.
								</Text>
							) : undefined}
						</>
					) : user.owner ? (
						<Text variant="small" tone="danger">
							You’re the only account in this club. The club and all its records
							will also be deleted.
						</Text>
					) : undefined}
					{user.hasPassword ? (
						<Field
							label="Password"
							secure
							autoComplete="current-password"
							isDisabled={task.busy}
							value={password}
							onValueChange={setPassword}
						/>
					) : (
						<VerifyAccount />
					)}
					<Field
						label="Type DELETE to confirm"
						isDisabled={task.busy}
						value={confirmed}
						onValueChange={setConfirmed}
					/>

					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
				</Stack>
			</Dialog>
		</>
	);
};
