import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Button, Text } from "../design-system";
import { ClubShell } from "./club-shell";
import { FitnessTests } from "./fitness-tests";
export const FitnessScreen = (): ReactElement => {
	const { account, source } = useApp();
	const router = useRouter();
	if (account.coachPrograms.length && source === "convex")
		return <FitnessTests />;
	return (
		<ClubShell
			title="Fitness"
			staffRole="coach"
			back={
				<Button
					label="Club"
					icon="arrowLeft"
					variant="ghost"
					onPress={(): void => router.navigate("/club")}
				/>
			}
		>
			{!account.coachPrograms.length ? (
				<Text>Coach access required.</Text>
			) : source !== "convex" ? (
				<Text>Sign in to record fitness results.</Text>
			) : (
				<FitnessTests />
			)}
		</ClubShell>
	);
};
