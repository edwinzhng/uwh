import type { ReactElement } from "react";
import { useBackend } from "../backend/context";
import { Button, Divider, ProviderLogo, Stack, Text } from "../design-system";
import { providerName, socialProviders } from "../domain/social-auth";
import { useTask } from "./use-task";

export const SocialSignIn = ({
	disabled = false,
}: {
	disabled?: boolean;
}): ReactElement | undefined => {
	const social = useBackend().social;
	const task = useTask();
	const providers = socialProviders.filter(
		(provider) => social?.info?.[provider],
	);
	if (!providers.length) return undefined;
	return (
		<Stack gap="sm">
			{providers.map((provider) => (
				<Button
					key={provider}
					label={`Continue with ${providerName(provider)}`}
					variant="secondary"
					leading={<ProviderLogo provider={provider} />}
					isDisabled={disabled}
					isLoading={task.busy}
					onPress={(): void => {
						void task.run(async (): Promise<void> => {
							if (!social?.info?.[provider])
								throw new Error(
									`${providerName(provider)} sign-in isn’t available yet. Please use email for now.`,
								);
							await social.signIn(provider);
						});
					}}
				/>
			))}
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
			<Divider label="OR" tone="primary" />
		</Stack>
	);
};
