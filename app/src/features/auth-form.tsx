import { type ReactElement, useState } from "react";
import { useBackend } from "../backend/context";
import { friendlyError } from "../backend/errors";
import {
	Button,
	Field,
	OtpInput,
	PageReveal,
	Row,
	SegmentedControl,
	Stack,
	Text,
} from "../design-system";
import {
	type AuthStep,
	authBackStep,
	authParameters,
	authPresentation,
	isResetCodeFailure,
	validateAuthStep,
} from "./auth-form-state";
import { EmailLinkForm } from "./email-link-form";
import { SocialSignIn } from "./social-sign-in";
import { useFormTask } from "./use-form-task";

export const AuthForm = ({
	initialStep = "signIn",
}: {
	initialStep?: "signIn" | "signUp" | "reset";
}): ReactElement => {
	const backend = useBackend();
	const [emailLink, setEmailLink] = useState(false);
	const [step, setStep] = useState<AuthStep>(initialStep);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmation, setConfirmation] = useState("");
	const [name, setName] = useState("");
	const [code, setCode] = useState("");
	const [sentAt, setSentAt] = useState(0);
	const task = useFormTask();
	const normalizedEmail = email.trim().toLowerCase();
	const presentation = authPresentation[step];
	const accountStep = step === "signIn" || step === "signUp";
	const canResend =
		step === "verify" || step === "resetCode" || step === "resetPassword";
	const clearCredentials = (): void => {
		setPassword("");
		setConfirmation("");
		setCode("");
	};
	const changeStep = (next: AuthStep): void => {
		if (task.busy) return;
		setStep(next);
		if (next === "signIn" || next === "signUp" || next === "reset")
			clearCredentials();
		task.clear();
	};
	const submit = async (completedCode = code): Promise<void> => {
		const fields = { email, password, confirmation, name, code: completedCode };
		await task.submit(
			(): string | undefined => validateAuthStep(step, fields),
			async (): Promise<void> => {
				const parameters = authParameters(step, fields);
				if (!parameters) {
					setStep("resetPassword");
					return;
				}
				if (!backend.authenticate)
					throw new Error("Sign-in is available in the connected app.");
				const result = await backend
					.authenticate(parameters)
					.catch((error: unknown): never => {
						if (
							step === "resetPassword" &&
							isResetCodeFailure(friendlyError(error))
						) {
							setStep("resetCode");
							throw new Error("Invalid or expired code. Request a new code.");
						}
						throw error;
					});
				if (step === "resetPassword" && !result)
					throw new Error("Could not reset your password. Try again.");
				clearCredentials();
				if (step === "reset") {
					setStep("resetCode");
					setSentAt(Date.now());
				} else if (!result && accountStep) {
					setStep("verify");
					setSentAt(Date.now());
				}
			},
		);
	};
	const resend = (): void => {
		void task.run(async (): Promise<void> => {
			if (Date.now() - sentAt < 60000)
				throw new Error("Wait a minute to resend");
			if (!backend.authenticate)
				throw new Error("Sign-in is available in the connected app.");
			await backend.authenticate({
				flow: step === "verify" ? "email-verification" : "reset",
				email: normalizedEmail,
			});
			setCode("");
			setSentAt(Date.now());
			if (step === "resetPassword") setStep("resetCode");
		});
	};
	if (emailLink)
		return (
			<EmailLinkForm
				initialEmail={email}
				onBack={(): void => setEmailLink(false)}
			/>
		);
	return (
		<Stack gap="sm">
			{accountStep ? (
				<SegmentedControl
					label="Account"
					hideLabel
					value={step}
					onValueChange={changeStep}
					options={[
						{ value: "signIn", label: "Sign in" },
						{ value: "signUp", label: "Create account" },
					]}
				/>
			) : undefined}
			<PageReveal key={step} replayOnFocus={false} gap="none">
				<Stack gap="sm">
					{!accountStep ? (
						<Text variant="h4">{presentation.title}</Text>
					) : undefined}
					{accountStep ? <SocialSignIn disabled={task.busy} /> : undefined}
					{step === "signUp" ? (
						<Field
							labelTone="primary"
							label="Name"
							autoComplete="name"
							value={name}
							onValueChange={setName}
							isDisabled={task.busy}
						/>
					) : undefined}
					{presentation.code ? (
						<Text variant="small">
							{step === "verify"
								? `Enter the code sent to ${normalizedEmail}.`
								: `If ${normalizedEmail} has an account, a reset code is on its way.`}
						</Text>
					) : step === "resetPassword" ? (
						<Text variant="small">Your code is checked when you save.</Text>
					) : (
						<Field
							labelTone="primary"
							label="Email"
							inputMode="email"
							autoComplete="email"
							value={email}
							onValueChange={setEmail}
							isDisabled={task.busy}
						/>
					)}
					{presentation.code ? (
						<OtpInput
							label="6-digit code"
							value={code}
							onValueChange={(value): void => {
								setCode(value);
								task.clear();
							}}
							onComplete={
								step === "verify"
									? (value): void => {
											void submit(value);
										}
									: undefined
							}
							status={task.error ? "error" : "idle"}
							isDisabled={task.busy}
							autoFocus
						/>
					) : undefined}
					{presentation.password ? (
						<Field
							labelTone="primary"
							label={step === "resetPassword" ? "New password" : "Password"}
							secure
							autoComplete={
								step === "signIn" ? "current-password" : "new-password"
							}
							value={password}
							onValueChange={setPassword}
							hint={step === "signIn" ? undefined : "At least 12 characters"}
							isDisabled={task.busy}
						/>
					) : undefined}
					{presentation.confirm ? (
						<Field
							labelTone="primary"
							label="Confirm password"
							secure
							autoComplete="new-password"
							value={confirmation}
							onValueChange={setConfirmation}
							isDisabled={task.busy}
						/>
					) : undefined}
					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
					<Stack gap="lg">
						<Stack>{undefined}</Stack>
						<Button
							label={presentation.submit}
							isLoading={task.busy}
							onPress={(): void => {
								void submit();
							}}
						/>
					</Stack>
					{step === "signIn" ? (
						<Row wrap>
							<Button
								label="Email me a sign-in link"
								variant="secondary"
								isDisabled={task.busy}
								onPress={(): void => {
									clearCredentials();
									setEmailLink(true);
								}}
							/>
							<Button
								label="Forgot password?"
								isDisabled={task.busy}
								variant="ghost"
								onPress={(): void => changeStep("reset")}
							/>
						</Row>
					) : !accountStep ? (
						<Row justify="between" wrap>
							<Button
								label="Back"
								prefix="arrowLeft"
								variant="secondary"
								isDisabled={task.busy}
								onPress={(): void => changeStep(authBackStep(step))}
							/>
							{canResend ? (
								<Button
									label="Resend code"
									variant="secondary"
									isDisabled={task.busy}
									onPress={resend}
								/>
							) : undefined}
						</Row>
					) : undefined}
				</Stack>
			</PageReveal>
		</Stack>
	);
};
