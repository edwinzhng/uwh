import { type ReactElement, useState } from "react";
import { useBackend } from "../backend/context";
import {
	Button,
	Field,
	Row,
	SegmentedControl,
	Stack,
	Text,
} from "../design-system";
import { SocialSignIn } from "./social-sign-in";
import { useFormTask } from "./use-form-task";

type Step = "signIn" | "signUp" | "verify" | "reset" | "resetCode";
export const AuthForm = ({
	initialStep = "signIn",
}: {
	initialStep?: "signIn" | "signUp";
}): ReactElement => {
	const backend = useBackend();
	const [step, setStep] = useState<Step>(initialStep);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [code, setCode] = useState("");
	const [sentAt, setSentAt] = useState(0);
	const task = useFormTask();
	const normalizedEmail = email.trim().toLowerCase();
	const submit = async (): Promise<void> => {
		await task.submit(
			(): string | undefined =>
				!normalizedEmail.includes("@")
					? "Enter a valid email address"
					: verify && !/^\d{8}$/.test(code)
						? "Enter the 8-digit code"
						: needsPassword &&
								(step === "signIn" ? !password : password.length < 12)
							? step === "signIn"
								? "Enter your password"
								: "Use at least 12 characters"
							: step === "signUp" && !name.trim()
								? "Enter your name"
								: undefined,
			async (): Promise<void> => {
				if (!backend.authenticate) return;
				const result = await backend.authenticate({
					flow:
						step === "verify"
							? "email-verification"
							: step === "resetCode"
								? "reset-verification"
								: step,
					email: normalizedEmail,
					password:
						step === "signIn" || step === "signUp" ? password : undefined,
					newPassword: step === "resetCode" ? password : undefined,
					name: step === "signUp" ? name.trim() : undefined,
					code:
						step === "verify" || step === "resetCode" ? code.trim() : undefined,
				});
				setPassword("");
				setCode("");
				if (step === "reset") {
					setStep("resetCode");
					setSentAt(Date.now());
				} else if (!result && (step === "signIn" || step === "signUp")) {
					setStep("verify");
					setSentAt(Date.now());
				}
			},
		);
	};
	const verify = step === "verify" || step === "resetCode";
	const needsPassword =
		step === "signIn" || step === "signUp" || step === "resetCode";
	return (
		<Stack gap="sm">
			{step === "signIn" || step === "signUp" ? (
				<SegmentedControl
					label="Account"
					hideLabel
					value={step}
					onValueChange={(value): void => {
						if (task.busy) return;
						setStep(value);
						task.clear();
					}}
					options={[
						{ value: "signIn", label: "Sign in" },
						{ value: "signUp", label: "Create account" },
					]}
				/>
			) : (
				<Text variant="h4">
					{step === "verify" ? "Verify email" : "Reset password"}
				</Text>
			)}
			{step === "signIn" || step === "signUp" ? (
				<SocialSignIn disabled={task.busy} />
			) : undefined}
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
			{verify ? (
				<Text variant="small" tone="secondary">
					{step === "verify"
						? `Enter the code sent to ${normalizedEmail}.`
						: `If ${normalizedEmail} has an account, a reset code is on its way.`}
				</Text>
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
			{verify ? (
				<Field
					labelTone="primary"
					label="8-digit code"
					inputMode="numeric"
					value={code}
					onValueChange={setCode}
					maxLength={8}
					isDisabled={task.busy}
				/>
			) : undefined}
			{needsPassword ? (
				<Field
					labelTone="primary"
					label={step === "resetCode" ? "New password" : "Password"}
					secure
					autoComplete={step === "signIn" ? "current-password" : "new-password"}
					value={password}
					onValueChange={setPassword}
					hint={step === "signIn" ? undefined : "At least 12 characters"}
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
					label={
						step === "signUp"
							? "Create account"
							: step === "signIn"
								? "Sign in"
								: step === "verify"
									? "Verify email"
									: step === "reset"
										? "Send code"
										: "Reset password"
					}
					isLoading={task.busy}
					onPress={(): void => {
						void submit();
					}}
				/>
			</Stack>
			<Row wrap>
				{step === "signIn" ? (
					<Button
						label="Forgot password?"
						isDisabled={task.busy}
						variant="ghost"
						onPress={(): void => {
							setStep("reset");
							setPassword("");
							task.clear();
						}}
					/>
				) : undefined}
				{verify ? (
					<Button
						label="Resend code"
						variant="ghost"
						isDisabled={task.busy}
						onPress={(): void => {
							void task.run(async (): Promise<void> => {
								if (Date.now() - sentAt < 60000)
									throw new Error(
										"Wait a minute before requesting another code.",
									);
								await backend.authenticate?.({
									flow: step === "verify" ? "email-verification" : "reset",
									email: normalizedEmail,
								});
								setSentAt(Date.now());
							});
						}}
					/>
				) : undefined}
				{step !== "signIn" && step !== "signUp" ? (
					<Button
						label="Back to sign in"
						variant="ghost"
						isDisabled={task.busy}
						onPress={(): void => {
							setStep("signIn");
							setPassword("");
							setCode("");
							task.clear();
						}}
					/>
				) : undefined}
			</Row>
		</Stack>
	);
};
