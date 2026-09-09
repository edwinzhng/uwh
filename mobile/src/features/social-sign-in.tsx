import type { ReactElement } from "react";
import { useBackend } from "../backend/context";
import { Button, Divider, Stack, Text } from "../design-system";
import { providerName, socialProviders } from "../domain/social-auth";
import { useTask } from "./use-task";

export const SocialSignIn = ({
	disabled = false,
}: {
	disabled?: boolean;
}): ReactElement => {
	const social = useBackend().social;
	const task = useTask();
	return (
		<Stack gap="sm">
			{socialProviders.map((provider) => (
				<Button
					key={provider}
					label={`Continue with ${providerName(provider)}`}
					variant="secondary"
					isDisabled={disabled || !social?.info?.[provider]}
					isLoading={task.busy}
					onPress={(): void => {
						void task.run(async (): Promise<void> => {
							await social?.signIn(provider);
						});
					}}
				/>
			))}
			{social?.info && !social.info.google && !social.info.apple ? (
				<Text variant="small" tone="secondary">
					Google and Apple sign-in aren’t available yet.
				</Text>
			) : undefined}
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
			<Divider />
		</Stack>
	);
};
