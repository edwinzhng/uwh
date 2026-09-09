import { type ReactElement, useState } from "react";
import { useBackend } from "../backend/context";
import { Button, Dialog, Field, Stack, Text } from "../design-system";
import { useTask } from "./use-task";

export const AccountPasswordAction = ({
	onSaved,
}: {
	onSaved: (status: string) => void;
}): ReactElement => {
	const backend = useBackend();
	const task = useTask();
	const [open, setOpen] = useState(false);
	const [sent, setSent] = useState(false);
	const [password, setPassword] = useState("");
	const [code, setCode] = useState("");
	const email = backend.accountInfo?.email ?? "";
	const changeOpen = (value: boolean): void => {
		if (task.busy) return;
		setPassword("");
		setCode("");
		setSent(false);
		task.clear();
		setOpen(value);
	};
	const sendCode = async (): Promise<void> => {
		await backend.authenticate?.({ flow: "reset", email });
		setSent(true);
		setCode("");
	};
	const save = async (): Promise<void> => {
		await backend.authenticate?.({
			flow: "reset-verification",
			email,
			newPassword: password,
			code,
		});
		setPassword("");
		setCode("");
		setOpen(false);
		onSaved("Password updated. Other devices signed out.");
	};
	return (
		<>
			<Button
				label="Change password"
				variant="secondary"
				onPress={(): void => changeOpen(true)}
			/>
			<Dialog
				title="Change password"
				isOpen={open}
				onOpenChange={changeOpen}
				footer={
					<Button
						label={sent ? "Save" : "Send code"}
						isLoading={task.busy}
						isDisabled={sent && (password.length < 12 || !/^\d{8}$/.test(code))}
						onPress={(): void => {
							void task.run(sent ? save : sendCode);
						}}
					/>
				}
			>
				<Stack>
					<Text variant="small">
						{sent
							? `Enter the code sent to ${email}.`
							: `We’ll email a code to ${email}.`}
					</Text>
					{sent ? (
						<>
							<Field
								label="8-digit code"
								inputMode="numeric"
								value={code}
								onValueChange={setCode}
								maxLength={8}
								isDisabled={task.busy}
							/>
							<Field
								label="New password"
								value={password}
								onValueChange={setPassword}
								secure
								autoComplete="new-password"
								maxLength={256}
								hint="At least 12 characters"
								isDisabled={task.busy}
							/>
							<Button
								label="Resend code"
								variant="ghost"
								isDisabled={task.busy}
								onPress={(): void => {
									void task.run(sendCode);
								}}
							/>
						</>
					) : undefined}
					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
				</Stack>
			</Dialog>
		</>
	);
};
