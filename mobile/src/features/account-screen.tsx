import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useActivePerson } from "../demo/app-state";
import { ListItem, SectionHeading, Stack, Surface } from "../design-system";
import { AccountParticipation } from "./account-participation";
import { CalendarExportButton } from "./calendar-export-button";
import { ClubShell } from "./club-shell";

export const AccountScreen = (): ReactElement => {
	const person = useActivePerson();
	const router = useRouter();
	return (
		<ClubShell
			title="Account"
			subtitle={`${person.name} · Choose a household member using the profile menu.`}
		>
			<AccountParticipation />
			<Stack gap="sm">
				<SectionHeading size="small">Personal records</SectionHeading>
				<Surface padding="xs">
					<Stack gap="none">
						<ListItem
							title="Membership, payments & equipment"
							description="Registration, payment history and borrowed equipment"
							icon="shield"
							onPress={(): void => router.push("/membership")}
						/>
						<ListItem
							title="Progress & feedback"
							icon="target"
							onPress={(): void => router.push("/my-progress")}
						/>
					</Stack>
				</Surface>
			</Stack>
			<Stack gap="sm">
				<SectionHeading size="small">Household & settings</SectionHeading>
				<Surface padding="xs">
					<ListItem
						title="Account settings"
						description="Household access, notifications, appearance and sign-in"
						icon="settings"
						onPress={(): void => router.push("/account-settings")}
					/>
				</Surface>
				<CalendarExportButton />
			</Stack>
		</ClubShell>
	);
};
