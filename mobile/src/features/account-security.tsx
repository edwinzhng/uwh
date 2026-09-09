import { type ReactElement, useState } from "react";
import { useBackend } from "../backend/context";
import { Button, Row, Stack, Surface, Text } from "../design-system";
import { AccountNameAction } from "./account-name-action";
import { AccountPasswordAction } from "./account-password-action";
import { ConnectedAccounts } from "./connected-accounts";
import { DeleteAccountAction } from "./delete-account-action";
import { useTask } from "./use-task";

export const AccountSecurity = (): ReactElement | undefined => {
	const backend = useBackend();
	const task = useTask();
	const [status, setStatus] = useState<string>();
	if (!backend.accountInfo) return undefined;
	return (
		<Surface>
			<Stack>
				<Text variant="h4">Account & security</Text>
				<Text variant="small" tone="secondary">
					{backend.accountInfo.email}
				</Text>
				<Row wrap>
					<AccountNameAction onSaved={setStatus} />
					{backend.accountInfo.hasPassword ? (
						<AccountPasswordAction onSaved={setStatus} />
					) : undefined}
					<Button
						label="Sign out other devices"
						variant="ghost"
						isLoading={task.busy}
						onPress={(): void => {
							void task.run(async (): Promise<void> => {
								await backend.signOutOthers?.();
								setStatus("Other devices signed out.");
							});
						}}
					/>
					<DeleteAccountAction />
				</Row>
				{status ? (
					<Text variant="small" tone="secondary">
						{status}
					</Text>
				) : undefined}
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
				<ConnectedAccounts />
			</Stack>
		</Surface>
	);
};
