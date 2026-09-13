import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { ListItem, SectionHeading, Stack, Surface } from "../design-system";
import { ClubShell } from "./club-shell";

export const ClubHomeScreen = (): ReactElement => {
	const { account, data } = useApp();
	const router = useRouter();
	return (
		<ClubShell title="Club" subtitle={data.clubName}>
			<Surface padding="xs">
				<Stack gap="none">
					<ListItem
						title="People"
						description="Players, parents and coaches"
						icon="users"
						onPress={(): void => router.push("/members")}
					/>
					<ListItem
						title="Programs & club information"
						description="Programs, pools and club timezone"
						icon="waves"
						onPress={(): void => router.push("/club-information")}
					/>
				</Stack>
			</Surface>
			{account.coachPrograms.length ? (
				<Stack gap="sm">
					<SectionHeading size="small">Coaching</SectionHeading>
					<Surface padding="xs">
						<Stack gap="none">
							<ListItem
								title="Players & progress"
								icon="users"
								onPress={(): void => router.push("/members")}
							/>
							<ListItem
								title="Coaching hours"
								icon="clock"
								onPress={(): void => router.push("/coaching-hours")}
							/>
							<ListItem
								title="Fitness tests"
								icon="lab"
								onPress={(): void => router.push("/fitness")}
							/>
							<ListItem
								title="Attendance reports"
								icon="layers"
								onPress={(): void => router.push("/attendance-report")}
							/>
						</Stack>
					</Surface>
				</Stack>
			) : undefined}
			{account.admin ? (
				<Stack gap="sm">
					<SectionHeading size="small">Manage club</SectionHeading>
					<Surface padding="xs">
						<Stack gap="none">
							<ListItem
								title="Registration"
								icon="users"
								onPress={(): void => router.push("/registration")}
							/>
							<ListItem
								title="Payments"
								icon="layers"
								onPress={(): void => router.push("/payments")}
							/>
							<ListItem
								title="Equipment"
								icon="archive"
								onPress={(): void => router.push("/equipment")}
							/>
							<ListItem
								title="Club settings"
								icon="settings"
								onPress={(): void => router.push("/settings")}
							/>
							<ListItem
								title="Moderation"
								icon="message"
								onPress={(): void => router.push("/moderation")}
							/>
							<ListItem
								title="Import data"
								icon="download"
								onPress={(): void => router.push("/import")}
							/>
						</Stack>
					</Surface>
				</Stack>
			) : undefined}
		</ClubShell>
	);
};
