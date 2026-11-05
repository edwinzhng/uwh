import type { ReactElement } from "react";
import { useBackend } from "../backend/context";
import { Button, Stack, Text } from "../design-system";
import { providerName, socialProviders } from "../domain/social-auth";
import { AuthForm } from "./auth-form";
import { useTask } from "./use-task";

export const VerifyAccount = (): ReactElement => {
	const backend = useBackend();
	const social = backend.social;
	const task = useTask();
	return (
		<Stack gap="sm">
			{social?.info?.reauthenticated &&
			!backend.accountInfo?.appleVerificationRequired ? (
				<Text variant="small" tone="success">
					Identity verified.
				</Text>
			) : (
				<>
					<Text variant="small">
						{backend.accountInfo?.appleVerificationRequired
							? "Verify with Apple to revoke its authorization when your account is deleted."
							: "Verify your identity to delete your account."}
					</Text>
					{socialProviders
						.filter(
							(provider) =>
								(!backend.accountInfo?.appleVerificationRequired ||
									provider === "apple") &&
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
					{backend.accountInfo?.email &&
					!backend.accountInfo.appleVerificationRequired ? (
						<AuthForm verificationEmail={backend.accountInfo.email} />
					) : undefined}
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
