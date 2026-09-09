import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import { ListItem, Stack, StaffSection, Surface, Text } from "../design-system";
import { ClubShell } from "./club-shell";
import { MemberAdmin } from "./member-admin";

export const ClubHomeScreen = (): ReactElement => {
	const { data, account } = useApp();
	const active = useActivePerson();
	const router = useRouter();
	return (
		<ClubShell title="Club" subtitle={data.clubName}>
			{account.admin ? (
				<StaffSection staffRole="admin">
					<Surface padding="xs">
						<ListItem
							title="Registration"
							icon="users"
							onPress={(): void =>
								router.push({
									pathname: "/administration",
									params: { section: "registration" },
								})
							}
						/>
						<ListItem
							title="Payments"
							icon="layers"
							onPress={(): void =>
								router.push({
									pathname: "/administration",
									params: { section: "payments" },
								})
							}
						/>
						<ListItem
							title="Equipment"
							icon="archive"
							onPress={(): void => router.push("/equipment")}
						/>
						<ListItem
							title="Club settings"
							icon="settings"
							onPress={(): void => router.navigate("/settings")}
						/>
						<ListItem
							title="Import data"
							icon="download"
							onPress={(): void => router.push("/import")}
						/>
					</Surface>
				</StaffSection>
			) : undefined}
			{account.coachPrograms.length ? (
				<StaffSection staffRole="coach">
					<Surface padding="xs">
						<ListItem
							title="Attendance & teams"
							icon="calendar"
							onPress={(): void => router.navigate("/schedule")}
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
						<ListItem
							title="Player progress & feedback"
							icon="target"
							onPress={(): void => router.navigate("/members")}
						/>
					</Surface>
				</StaffSection>
			) : undefined}
			<Stack gap="sm">
				<Text variant="h4">
					{active.id === account.personId
						? "My membership"
						: `${active.name.split(" ").at(0)}’s membership`}
				</Text>
				<MemberAdmin key={active.id} member={active} readOnly />
			</Stack>
		</ClubShell>
	);
};
