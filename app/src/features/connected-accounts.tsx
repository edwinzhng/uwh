import type { ReactElement } from "react";
import { useBackend } from "../backend/context";
import { Divider, SectionHeading, Stack } from "../design-system";
import { socialProviders } from "../domain/social-auth";
import { ConnectedAccountRow } from "./connected-account-row";

export const ConnectedAccounts = (): ReactElement | undefined => {
	const info = useBackend().social?.info;
	const providers = socialProviders.filter(
		(provider) =>
			info?.[provider] ||
			info?.accounts.some((account) => account.provider === provider),
	);
	if (!providers.length) return undefined;
	return (
		<Stack gap="heading">
			<Divider />
			<SectionHeading>Connected accounts</SectionHeading>
			{providers.flatMap((provider) => {
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
