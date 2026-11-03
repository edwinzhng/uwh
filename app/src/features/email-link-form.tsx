import { type ReactElement, useState } from "react";
import { useBackend } from "../backend/context";
import { Button, Field, Stack, Text } from "../design-system";
import { signInEmailError } from "../domain/email-sign-in";
import { useFormTask } from "./use-form-task";

export const EmailLinkForm = ({
	initialEmail,
	onBack,
}: {
	initialEmail: string;
	onBack: () => void;
}): ReactElement => {
	const backend = useBackend();
	const task = useFormTask();
	const [email, setEmail] = useState(initialEmail);
	const [sent, setSent] = useState<{ email: string; at: number }>();
	const submit = async (): Promise<void> => {
		await task.submit(
			() => signInEmailError(email),
			async (): Promise<void> => {
				const normalized = email.trim().toLowerCase();
				if (sent?.email === normalized && Date.now() - sent.at < 60000)
					throw new Error("Wait a minute before requesting another link.");
				if (!backend.requestEmailSignIn)
					throw new Error("Email sign-in is unavailable.");
				await backend.requestEmailSignIn(normalized);
				setSent({ email: normalized, at: Date.now() });
			},
		);
	};
	return (
		<Stack gap="md">
			<Text variant="h4">Sign in by email</Text>
			<Text variant="small" tone="secondary">
				Get a one-time link. No password needed.
			</Text>
			<Field
				label="Email"
				value={email}
				onValueChange={setEmail}
				inputMode="email"
				autoComplete="email"
				isDisabled={task.busy}
			/>
			{sent ? (
				<Text variant="small">
					A sign-in link was sent to {sent.email}. It expires in 10 minutes.
					Open it on the device where you want to sign in.
				</Text>
			) : undefined}
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
			<Button
				label={sent ? "Send another link" : "Email me a sign-in link"}
				isLoading={task.busy}
				onPress={(): void => {
					void submit();
				}}
			/>
			<Button
				label="Use a password instead"
				variant="ghost"
				isDisabled={task.busy}
				onPress={onBack}
			/>
		</Stack>
	);
};
