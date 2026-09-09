import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import {
	ListItem,
	SectionHeading,
	Stack,
	StaffSection,
} from "../design-system";
import { ClubShell } from "./club-shell";
import { MemberAdmin } from "./member-admin";

export const ClubHomeScreen = (): ReactElement => {
	const { account } = useApp();
	const active = useActivePerson();
	const router = useRouter();
	return (
		<ClubShell title="Club management">
			{account.admin ? (
				<StaffSection staffRole="admin" padding="xs">
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
							onPress={(): void => router.navigate("/settings")}
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
				</StaffSection>
			) : undefined}
			{account.coachPrograms.length ? (
				<StaffSection staffRole="coach" padding="xs">
					<Stack gap="none">
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
				</StaffSection>
			) : undefined}
			<Stack gap="sm">
				<SectionHeading>
					{active.id === account.personId
						? "My membership"
						: `${active.name.split(" ").at(0)}’s membership`}
				</SectionHeading>
				<MemberAdmin key={active.id} member={active} readOnly />
			</Stack>
		</ClubShell>
	);
};
