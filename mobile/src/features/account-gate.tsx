import { type ReactElement, useState } from "react";
import { useBackend } from "../backend/context";
import {
	AuthLayout,
	Button,
	Field,
	ListItem,
	SegmentedControl,
	Stack,
	Text,
} from "../design-system";
import { AccountSecurity } from "./account-security";
import { AuthForm } from "./auth-form";
import { useTask } from "./use-task";

export const AccountGate = (): ReactElement => {
	const backend = useBackend();
	const task = useTask();
	const [mode, setMode] = useState("join");
	const [club, setClub] = useState("");
	const [name, setName] = useState("");
	const requests = backend.accountInfo?.pending ?? [];
	const pending = requests.some((request) => request.state === "pending");
	return (
		<AuthLayout title="Crocs Club">
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
					<Text variant="h4">
						{pending ? "Awaiting approval" : "Your club"}
					</Text>
					{requests.map((request) => (
						<ListItem
							key={request.id}
							title={request.club}
							description={
								request.state === "pending"
									? "An admin will review your request."
									: request.state === "declined"
										? "Access wasn’t approved."
										: "Club access is no longer available."
							}
							trailing={
								<Button
									label={request.state === "pending" ? "Cancel" : "Dismiss"}
									variant="ghost"
									isDisabled={task.busy}
									onPress={(): void => {
										void task.run(async (): Promise<void> => {
											await backend.cancelRequest?.(request.id);
										});
									}}
								/>
							}
						/>
					))}
					{!pending ? (
						<>
							<SegmentedControl
								label="Club"
								value={mode}
								onValueChange={setMode}
								options={[
									{ value: "join", label: "Join club" },
									{ value: "create", label: "Create club" },
								]}
							/>
							{mode === "join" ? (
								<Field label="Club code" value={club} onValueChange={setClub} />
							) : (
								<Field label="Club name" value={name} onValueChange={setName} />
							)}
							<Button
								label={mode === "join" ? "Request access" : "Create club"}
								isLoading={task.busy}
								isDisabled={mode === "join" ? !club.trim() : !name.trim()}
								onPress={(): void => {
									void task.run(async (): Promise<void> => {
										if (mode === "join") await backend.joinClub?.(club);
										else await backend.createClub?.(name, false);
									});
								}}
							/>
						</>
					) : undefined}
					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
					<AccountSecurity />
					<Button
						label="Sign out"
						variant="ghost"
						onPress={(): void => {
							void backend.signOut?.();
						}}
					/>
				</Stack>
			)}
		</AuthLayout>
	);
};
