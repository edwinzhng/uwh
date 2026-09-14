import { type ReactElement, useState } from "react";
import { useBackend } from "../backend/context";
import { Row, SectionHeading, Stack, Surface, Text } from "../design-system";
import { AccountNameAction } from "./account-name-action";
import { AccountPasswordAction } from "./account-password-action";
import { ConfirmButton } from "./confirm-button";
import { ConnectedAccounts } from "./connected-accounts";
import { DeleteAccountAction } from "./delete-account-action";

export const AccountSecurity = (): ReactElement | undefined => {
	const backend = useBackend();
	const [status, setStatus] = useState<string>();
	if (!backend.accountInfo) return undefined;
	return (
		<Stack gap="sm">
			<SectionHeading>Account & security</SectionHeading>
			<Surface>
				<Stack>
					<Text variant="small" tone="secondary">
						{backend.accountInfo.email}
					</Text>
					<Row wrap>
						<AccountNameAction onSaved={setStatus} />
						{backend.accountInfo.hasPassword ? (
							<AccountPasswordAction onSaved={setStatus} />
						) : undefined}
						<ConfirmButton
							label="Sign out other devices"
							variant="ghost"
							title="Sign out other devices?"
							description="Other sessions will end. You’ll stay signed in here."
							confirmLabel="Sign out devices"
							onConfirm={async (): Promise<void> => {
								if (!backend.signOutOthers)
									throw new Error("Connect to your account first.");
								await backend.signOutOthers();
								setStatus("Other devices signed out.");
							}}
						/>
						<DeleteAccountAction />
					</Row>
					{status ? (
						<Text variant="small" tone="secondary">
							{status}
						</Text>
					) : undefined}
					<ConnectedAccounts />
				</Stack>
			</Surface>
		</Stack>
	);
};
