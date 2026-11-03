import { type ReactElement, useState } from "react";
import { useBackend } from "../backend/context";
import { AuthLayout, Button, Field, Stack, Text } from "../design-system";
import { AuthForm } from "./auth-form";
import { useTask } from "./use-task";

export const AccountGate = (): ReactElement => {
	const backend = useBackend();
	const task = useTask();
	const [club, setClub] = useState("");
	return (
		<AuthLayout
			title={
				backend.authenticated && backend.accountInfo
					? "Enter invite code"
					: "UWH Club"
			}
		>
			{!backend.authenticated ? (
				<AuthForm />
			) : !backend.accountInfo ? (
				<Stack>
					<Text>Your session expired. Sign in again.</Text>
					<Button
						label="Sign in"
						onPress={(): void => {
							void backend.signOut?.();
						}}
					/>
				</Stack>
			) : (
				<Stack>
					<Field
						label="Invite code"
						labelTone="primary"
						value={club}
						onValueChange={(value): void =>
							setClub(value.replace(/[^a-z0-9]/gi, "").toUpperCase())
						}
						maxLength={6}
					/>
					<Button
						label="Join"
						isLoading={task.busy}
						validationError={
							!club.trim() ? "Enter your invite code" : undefined
						}
						onPress={(): void => {
							void task.run(async (): Promise<void> => {
								await backend.joinClub?.(club);
							});
						}}
					/>
					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
				</Stack>
			)}
		</AuthLayout>
	);
};
