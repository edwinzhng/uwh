import { type ReactElement, useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { useBackend } from "../backend/context";
import { Button, Dialog, Field, Select, Stack, Text } from "../design-system";
import { useFormTask } from "./use-form-task";

import { VerifyAccount } from "./verify-account";

export const DeleteAccountAction = (): ReactElement | undefined => {
	const backend = useBackend();
	const user = backend.accountInfo;
	const task = useFormTask();
	const [open, setOpen] = useState(false);
	const [confirmed, setConfirmed] = useState("");
	const [transferTo, setTransferTo] = useState<Id<"users">>();
	if (!user) return undefined;
	const changeOpen = (value: boolean): void => {
		if (task.busy) return;
		setConfirmed("");
		setTransferTo(undefined);
		task.clear();
		setOpen(value);
	};
	return (
		<>
			<Button
				label="Delete account"
				variant="danger-text"
				onPress={(): void => changeOpen(true)}
			/>
			<Dialog
				intent="form"
				isDismissDisabled={task.busy}
				isOpen={open}
				onOpenChange={changeOpen}
				title="Delete account?"
				footer={
					<Button
						label="Delete account"
						variant="danger"
						isLoading={task.busy}
						onPress={(): void => {
							void task.submit(
								() =>
									confirmed !== "DELETE"
										? "Type DELETE to confirm."
										: user.appleVerificationRequired
											? "Verify with Apple before deleting your account."
											: !backend.social?.info?.reauthenticated
												? "Verify your identity before deleting your account."
												: user.mustTransfer && !transferTo
													? "Choose a new club owner."
													: undefined,
								async (): Promise<void> => {
									if (!backend.deleteAccount)
										throw new Error(
											"Account deletion is unavailable. Try again.",
										);
									await backend.deleteAccount(undefined, transferTo);
									await backend.signOut?.();
								},
							);
						}}
					/>
				}
			>
				<Stack>
					<Text variant="small">
						Your account, profile, messages, photos and child profiles managed
						only by you will be deleted. Attendance records stay with the club
						without these profiles. Children linked to another account remain.
					</Text>
					<Text variant="small" tone="secondary">
						Your coaching feedback, resources and uploaded files will also be
						deleted. Apple authorization and hosted videos may take additional
						time to be removed from their providers.
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
									person: { name: target.name },
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
					<VerifyAccount />
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
