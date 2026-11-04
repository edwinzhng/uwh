import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import {
	Button,
	EmptyState,
	featureIdentity,
	ListItem,
	Row,
	SectionHeading,
	Stack,
	Surface,
} from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { CoachingHomeTasks } from "./coaching-home-tasks";
import { HomeCoaching } from "./home-coaching";

export const CoachDashboard = ({
	nextPractice,
}: {
	nextPractice?: ClubEvent;
}): ReactElement => {
	const router = useRouter();
	return (
		<Stack gap="md">
			{nextPractice ? (
				<HomeCoaching event={nextPractice} />
			) : (
				<EmptyState
					title="No upcoming practices"
					description="Open Schedule to find another practice."
					action={
						<Button
							label="Open schedule"
							variant="secondary"
							onPress={(): void => router.navigate("/schedule")}
						/>
					}
				/>
			)}
			<CoachingHomeTasks />
			<Stack gap="sm">
				<SectionHeading icon="trophy">Coaching tools</SectionHeading>
				<Surface>
					<Stack gap="none">
						<ListItem
							title="Fitness tests"
							description="Record and review swim tests"
							icon={featureIdentity.fitness.icon}
							onPress={(): void => router.push("/fitness")}
						/>
						<ListItem
							title="Coaching hours"
							description="Practice assignments and recorded hours"
							icon="clock"
							onPress={(): void => router.push("/coaching-hours")}
						/>
						<ListItem
							title="Attendance"
							icon="barChart"
							onPress={(): void => router.push("/attendance-report")}
						/>
					</Stack>
				</Surface>
			</Stack>
			<Row justify="end">
				<Button
					label="All club tools"
					variant="ghost"
					onPress={(): void => router.navigate("/club")}
				/>
			</Row>
		</Stack>
	);
};
