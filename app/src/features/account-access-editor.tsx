import { type ReactElement, useState } from "react";
import { useBackend } from "../backend/context";
import { useApp } from "../demo/app-state";
import { Button, Dialog, Stack, Text, Toggle } from "../design-system";
import type { Account } from "../domain/app-types";
import { useFormTask } from "./use-form-task";

export const AccountAccessEditor = ({
	account,
	onClose,
}: {
	account: Account;
	onClose: () => void;
}): ReactElement => {
	const { data } = useApp();
	const backend = useBackend();
	const [children, setChildren] = useState(account.children);
	const [coaching, setCoaching] = useState(account.coachPrograms);
	const [admin, setAdmin] = useState(account.admin);
	const [verified, setVerified] = useState(false);
	const task = useFormTask();
	const save = (): void => {
		const setAccess = backend.setAccess;
		if (!setAccess) return;
		void task.submit(
			() =>
				verified ? undefined : "Verify these permissions and family links.",
			async (): Promise<void> => {
				await setAccess(account.id, children, coaching, admin);
				onClose();
			},
		);
	};
	return (
		<Dialog
			intent="form"
			isDismissDisabled={task.busy}
			title={`Access · ${account.name}`}
			isOpen
			onOpenChange={(open): void => {
				if (!open && !task.busy) onClose();
			}}
			footer={
				<Button
					label="Save access"
					isLoading={task.busy}
					isDisabled={!verified || !backend.setAccess}
					onPress={save}
				/>
			}
		>
			<Stack>
				<Text variant="label">Linked children</Text>
				{data.members
					.filter((member) => member.id !== account.personId)
					.map((member) => (
						<Toggle
							key={member.id}
							label={member.name}
							value={children.includes(member.id)}
							isDisabled={task.busy}
							onValueChange={(value): void =>
								setChildren((ids) =>
									value
										? [...ids, member.id]
										: ids.filter((id) => id !== member.id),
								)
							}
						/>
					))}
				<Text variant="label">Coaching access</Text>
				<Toggle
					label="Coach"
					value={coaching.length > 0}
					isDisabled={task.busy}
					onValueChange={(value): void =>
						setCoaching(value ? ["club", "youth"] : [])
					}
				/>
				<Toggle
					label="Club administrator"
					value={admin}
					isDisabled={task.busy}
					onValueChange={setAdmin}
				/>
				<Toggle
					label="I’ve verified these permissions and family links"
					value={verified}
					isDisabled={task.busy}
					onValueChange={setVerified}
				/>
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
