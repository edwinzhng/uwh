import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import { ListItem, Stack, Surface, TabContent, Tabs } from "../design-system";
import { ClubShell } from "./club-shell";
import { MemberAdmin } from "./member-admin";

export const ClubHomeScreen = (): ReactElement => {
	const { account } = useApp();
	const active = useActivePerson();
	const router = useRouter();
	const staff = account.admin || account.coachPrograms.length > 0;
	const [selected, setSelected] = useState("membership");
	const options = [
		{ value: "membership", label: "Membership" },
		...(account.admin ? [{ value: "admin", label: "Admin" }] : []),
		...(account.coachPrograms.length
			? [{ value: "coaching", label: "Coaching" }]
			: []),
	];
	const tab = options.some((option) => option.value === selected)
		? selected
		: "membership";

	return (
		<ClubShell
			title={staff ? "Club" : "Membership"}
			tabs={
				staff ? (
					<Tabs
						page
						hideLabel
						label="Club views"
						value={tab}
						onValueChange={setSelected}
						options={options}
					/>
				) : undefined
			}
		>
			<TabContent value={tab}>
				{tab === "admin" && account.admin ? (
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
					</Surface>
				) : undefined}
				{tab === "coaching" && account.coachPrograms.length ? (
					<Surface padding="xs">
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
					</Surface>
				) : undefined}
				{tab === "membership" ? (
					<MemberAdmin key={active.id} member={active} readOnly />
				) : undefined}
			</TabContent>
		</ClubShell>
	);
};
