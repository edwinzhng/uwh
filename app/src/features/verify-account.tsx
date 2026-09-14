import type { ReactElement } from "react";
import { useBackend } from "../backend/context";
import { Button, Stack, Text } from "../design-system";
import { providerName, socialProviders } from "../domain/social-auth";
import { useTask } from "./use-task";

export const VerifyAccount = (): ReactElement => {
	const social = useBackend().social;
	const task = useTask();
	return (
		<Stack gap="sm">
			{social?.info?.reauthenticated ? (
				<Text variant="small" tone="success">
					Identity verified.
				</Text>
			) : (
				<>
					<Text variant="small">
						Verify your identity to delete your account.
					</Text>
					{socialProviders
						.filter((provider) =>
							social?.info?.accounts.some(
								(account) => account.provider === provider,
							),
						)
						.map((provider) => (
							<Button
								key={provider}
								label={`Verify with ${providerName(provider)}`}
								variant="secondary"
								isLoading={task.busy}
								isDisabled={!social?.info?.[provider]}
								onPress={(): void => {
									void task.run(async (): Promise<void> => {
										await social?.connect(provider, "verify");
									});
								}}
							/>
						))}
				</>
			)}
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
		</Stack>
	);
};
