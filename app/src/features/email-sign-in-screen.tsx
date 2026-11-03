import { useGlobalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useBackend } from "../backend/context";
import { AuthLayout, Button, Stack, Text } from "../design-system";
import { validEmailSignInToken } from "../domain/email-sign-in";
import { useFormTask } from "./use-form-task";

export const EmailSignInScreen = (): ReactElement => {
	const { code } = useGlobalSearchParams<{ code?: string }>();
	const backend = useBackend();
	const router = useRouter();
	const task = useFormTask();
	const complete = async (): Promise<void> => {
		await task.submit(
			() =>
				validEmailSignInToken(code)
					? undefined
					: "This link is invalid. Request a new sign-in email.",
			async (): Promise<void> => {
				if (!code || !backend.completeEmailSignIn)
					throw new Error("Email sign-in is unavailable.");
				await backend.completeEmailSignIn(code);
				router.replace("/");
			},
		);
	};
	return (
		<AuthLayout title="Sign in to UWH Club">
			<Stack gap="md">
				<Text variant="small" tone="secondary">
					Continue to use your one-time email link. Links expire after 10
					minutes and work once.
				</Text>
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
				<Button
					label="Continue"
					isLoading={task.busy}
					onPress={(): void => {
						void complete();
					}}
				/>
				<Button
					label="Request a new sign-in link"
					variant="ghost"
					isDisabled={task.busy}
					onPress={(): void => router.replace("/")}
				/>
			</Stack>
		</AuthLayout>
	);
};
