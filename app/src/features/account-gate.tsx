import { type ReactElement, useState } from "react";
import { useBackend } from "../backend/context";
import { AuthLayout, Button, Field, Stack, Text } from "../design-system";
import { AppInformationLinks } from "./app-information-links";
import { AuthForm } from "./auth-form";
import { DeleteAccountAction } from "./delete-account-action";
import { useFormTask } from "./use-form-task";

export const AccountGate = (): ReactElement => {
	const backend = useBackend();
	const task = useFormTask();
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
						maxLength={32}
						isDisabled={task.busy}
					/>
					<Button
						label="Join"
						isLoading={task.busy}
						onPress={(): void => {
							void task.submit(
								() =>
									/^(?:[A-Z0-9]{6}|[A-Z2-9]{32})$/.test(club)
										? undefined
										: "Enter a club or staff invite code.",
								async (): Promise<void> => {
									if (!backend.joinClub)
										throw new Error("Joining is unavailable.");
									await backend.joinClub(club);
								},
							);
						}}
					/>
					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
					<Button
						label="Sign out"
						variant="ghost"
						isDisabled={task.busy}
						onPress={(): void => {
							void task.run(async (): Promise<void> => {
								await backend.signOut?.();
							});
						}}
					/>
					<DeleteAccountAction />
					<AppInformationLinks />
				</Stack>
			)}
		</AuthLayout>
	);
};
