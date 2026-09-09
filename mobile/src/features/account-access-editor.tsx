import { type ReactElement, useState } from "react";
import { useBackend } from "../backend/context";
import { friendlyError } from "../backend/errors";
import { useApp } from "../demo/app-state";
import { Button, Dialog, Stack, Text, Toggle } from "../design-system";
import type { Account } from "../domain/app-types";

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
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();
	const save = async (): Promise<void> => {
		if (!backend.setAccess) return;
		setBusy(true);
		setError(undefined);
		try {
			await backend.setAccess(account.id, children, coaching, admin);
			onClose();
		} catch (error) {
			setError(friendlyError(error));
		} finally {
			setBusy(false);
		}
	};
	return (
		<Dialog
			staffRole="admin"
			title={`Access · ${account.name}`}
			isOpen
			onOpenChange={(open): void => {
				if (!open) onClose();
			}}
			footer={
				<Button
					label="Save access"
					isLoading={busy}
					isDisabled={!verified}
					onPress={(): void => {
						void save();
					}}
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
					onValueChange={(value): void =>
						setCoaching(value ? ["club", "youth"] : [])
					}
				/>
				<Toggle
					label="Club administrator"
					value={admin}
					onValueChange={setAdmin}
				/>
				<Toggle
					label="I’ve verified these permissions and family links"
					value={verified}
					onValueChange={setVerified}
				/>
				{error ? (
					<Text variant="small" tone="danger">
						{error}
					</Text>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
