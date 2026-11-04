import { type ReactElement, useState } from "react";
import { useBackend } from "../backend/context";
import {
	Button,
	Field,
	OtpInput,
	PageReveal,
	Row,
	Stack,
	Text,
} from "../design-system";
import {
	signInEmailError,
	validEmailSignInCode,
} from "../domain/email-sign-in";
import { SocialSignIn } from "./social-sign-in";
import { useFormTask } from "./use-form-task";

export const AuthForm = ({
	verificationEmail,
}: {
	verificationEmail?: string;
}): ReactElement => {
	const backend = useBackend();
	const task = useFormTask();
	const [email, setEmail] = useState(verificationEmail ?? "");
	const [code, setCode] = useState("");
	const [sent, setSent] = useState<{ email: string; at: number }>();
	const send = async (): Promise<void> => {
		await task.submit(
			() => signInEmailError(email),
			async (): Promise<void> => {
				const normalized = email.trim().toLowerCase();
				if (sent?.email === normalized && Date.now() - sent.at < 60000)
					throw new Error("Wait a minute before requesting another code.");
				if (!backend.requestEmailCode)
					throw new Error("Email sign-in is unavailable.");
				await backend.requestEmailCode(normalized);
				setSent({ email: normalized, at: Date.now() });
				setCode("");
			},
		);
	};
	const verify = async (value = code): Promise<void> => {
		await task.submit(
			() =>
				validEmailSignInCode(value) ? undefined : "Enter the 6-digit code.",
			async (): Promise<void> => {
				if (!sent || !backend.completeEmailCode)
					throw new Error("Request a new sign-in code.");
				await backend.completeEmailCode(sent.email, value.trim());
				setCode("");
			},
		);
	};
	return (
		<PageReveal key={sent ? "code" : "email"} replayOnFocus={false} gap="none">
			<Stack gap="sm">
				{sent ? (
					<>
						<Text variant="h4">Check your email</Text>
						<Text variant="small">
							Enter the code sent to {sent.email}. It expires in 10 minutes.
						</Text>
						<OtpInput
							label="6-digit code"
							value={code}
							onValueChange={(value): void => {
								setCode(value);
								task.clear();
							}}
							onComplete={(value): void => {
								void verify(value);
							}}
							status={task.error ? "error" : "idle"}
							isDisabled={task.busy}
							autoFocus
						/>
					</>
				) : (
					<>
						{!verificationEmail ? (
							<SocialSignIn disabled={task.busy} />
						) : undefined}
						{verificationEmail ? (
							<Text variant="small">
								Send a verification code to {verificationEmail}.
							</Text>
						) : (
							<Field
								label="Email"
								labelTone="primary"
								inputMode="email"
								autoComplete="email"
								value={email}
								onValueChange={setEmail}
								isDisabled={task.busy}
							/>
						)}
					</>
				)}
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
				<Button
					label={
						sent
							? verificationEmail
								? "Verify identity"
								: "Sign in"
							: "Email me a code"
					}
					isLoading={task.busy}
					onPress={(): void => {
						void (sent ? verify() : send());
					}}
				/>
				{sent ? (
					<Row justify="between" wrap>
						{!verificationEmail ? (
							<Button
								label="Change email"
								variant="ghost"
								isDisabled={task.busy}
								onPress={(): void => {
									setSent(undefined);
									setCode("");
									task.clear();
								}}
							/>
						) : undefined}
						<Button
							label="Resend code"
							variant="secondary"
							isDisabled={task.busy}
							onPress={(): void => {
								void send();
							}}
						/>
					</Row>
				) : undefined}
			</Stack>
		</PageReveal>
	);
};
