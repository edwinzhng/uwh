import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useActivePerson } from "../demo/app-state";
import { Stack, TabContent, Tabs, Text } from "../design-system";
import { AccountHousehold } from "./account-household";
import { AccountSettingsContent } from "./account-settings-screen";
import { CalendarExportButton } from "./calendar-export-button";
import { ClubShell } from "./club-shell";
import { MemberAdmin } from "./member-admin";
import { MemberAttendance } from "./member-attendance";
import { MemberProgress } from "./member-progress";

export const AccountScreen = (): ReactElement => {
	const person = useActivePerson();
	const router = useRouter();
	const params = useLocalSearchParams<{ tab?: string }>();
	const tab = ["progress", "attendance", "household", "settings"].includes(
		params.tab ?? "",
	)
		? (params.tab ?? "membership")
		: "membership";
	return (
		<ClubShell
			title="Account"
			subtitle="Choose a household member using the profile menu."
			tabs={
				<Tabs
					page
					hideLabel
					label="Account"
					value={tab}
					onValueChange={(value): void => router.setParams({ tab: value })}
					options={[
						{ value: "membership", label: "Membership" },
						{ value: "progress", label: "Progress" },
						{ value: "attendance", label: "Attendance" },
						{ value: "household", label: "Household" },
						{ value: "settings", label: "Settings" },
					]}
				/>
			}
		>
			<TabContent value={tab}>
				{tab === "household" ? (
					<AccountHousehold />
				) : tab === "settings" ? (
					<Stack>
						<AccountSettingsContent />
						<CalendarExportButton />
					</Stack>
				) : tab === "attendance" ? (
					<MemberAttendance key={person.id} member={person} />
				) : tab === "progress" ? (
					<MemberProgress key={person.id} member={person} />
				) : (
					<Stack>
						<Text variant="small" tone="secondary">
							Contact a club administrator to complete registration, update
							membership details or arrange payment. Payments shown here are
							records of money already received.
						</Text>
						<MemberAdmin key={person.id} member={person} readOnly />
					</Stack>
				)}
			</TabContent>
		</ClubShell>
	);
};
