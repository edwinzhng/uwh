import type { ReactElement } from "react";
import { useBackend } from "../backend/context";
import { Divider, Stack, Text } from "../design-system";
import { socialProviders } from "../domain/social-auth";
import { ConnectedAccountRow } from "./connected-account-row";

export const ConnectedAccounts = (): ReactElement => {
	const info = useBackend().social?.info;
	return (
		<Stack>
			<Divider />
			<Text variant="h4">Connected accounts</Text>
			{socialProviders.flatMap((provider) => {
				const accounts =
					info?.accounts.filter((account) => account.provider === provider) ??
					[];
				return accounts.length
					? accounts.map((account) => (
							<ConnectedAccountRow
								key={account.id}
								provider={provider}
								account={account}
							/>
						))
					: [<ConnectedAccountRow key={provider} provider={provider} />];
			})}
		</Stack>
	);
};
