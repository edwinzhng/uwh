import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { FitnessProvider } from "../backend/fitness-actions";
import { useActivePerson, useApp } from "../demo/app-state";
import { Button, RoleScope, Text } from "../design-system";
import { canReadProgress } from "../domain/app-rules";
import { ClubShell } from "./club-shell";
import { FitnessTests } from "./fitness-tests";
import { PersonalFitness } from "./personal-fitness";
export const FitnessScreen = (): ReactElement => {
	const { account, data } = useApp();
	const active = useActivePerson();
	const { person } = useLocalSearchParams<{ person?: string }>();
	const router = useRouter();
	const member = data.members.find(
		(entry) => entry.id === (person ?? active.id),
	);
	return person || !account.coachPrograms.length ? (
		<ClubShell
			title="Fitness tests"
			subtitle={member?.name}
			back={
				<Button
					label="Back"
					icon="arrowLeft"
					variant="ghost"
					onPress={(): void => router.back()}
				/>
			}
		>
			{member && canReadProgress(account, member) ? (
				<PersonalFitness member={member} full />
			) : (
				<Text>These fitness results are private.</Text>
			)}
		</ClubShell>
	) : (
		<FitnessProvider>
			<RoleScope tone="coach">
				<FitnessTests />
			</RoleScope>
		</FitnessProvider>
	);
};
