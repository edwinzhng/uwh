import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useBackend } from "../backend/context";
import {
	AuthLayout,
	Button,
	LoadingContent,
	Stack,
	Text,
} from "../design-system";
import { AuthForm } from "./auth-form";
import { useTask } from "./use-task";

export const JoinInviteScreen = (): ReactElement => {
	const { invite = "", revision: version = "" } = useLocalSearchParams<{
		invite?: string;
		revision?: string;
	}>();
	const revision = Number(version);
	const valid =
		Boolean(invite) && Number.isSafeInteger(revision) && revision > 0;
	const details = useQuery(
		api.invites.preview,
		valid ? { invite, revision } : "skip",
	);
	const accept = useMutation(api.invites.accept);
	const backend = useBackend();
	const router = useRouter();
	const task = useTask();
	const openClub = (): void => router.replace("/schedule");
	return (
		<AuthLayout
			title={details ? `Join ${details.clubName}` : "Club invitation"}
		>
			<Stack>
				{valid && details === undefined ? (
					<LoadingContent />
				) : !details || details.state !== "pending" ? (
					<>
						<Text>
							{details?.state === "accepted"
								? "Invitation accepted."
								: "This invite has expired or is no longer available. Ask an admin for a new one."}
						</Text>
						<Button
							label={details?.acceptedByYou ? "Open club" : "Continue"}
							onPress={openClub}
						/>
					</>
				) : !backend.authenticated ? (
					<>
						<Text variant="small" tone="secondary">
							Use the email address that received this invite.
						</Text>
						<AuthForm initialStep="signUp" />
					</>
				) : (
					<>
						<Text variant="small">{backend.accountInfo?.email}</Text>
						{!details.matchesEmail ? (
							<Text variant="small">
								Sign in with the email address that received this invite.
							</Text>
						) : (
							<Button
								label="Join club"
								isLoading={task.busy}
								onPress={(): void => {
									void task.run(async (): Promise<void> => {
										await accept({ invite, revision });
										openClub();
									});
								}}
							/>
						)}
						{task.error ? (
							<Text variant="small" tone="danger">
								{task.error}
							</Text>
						) : undefined}
						<Button
							label="Use another account"
							variant="ghost"
							isDisabled={task.busy}
							onPress={(): void => {
								void task.run(async (): Promise<void> => {
									await backend.signOut?.();
								});
							}}
						/>
					</>
				)}
			</Stack>
		</AuthLayout>
	);
};
