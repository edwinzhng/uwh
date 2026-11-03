import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useActivePerson } from "../demo/app-state";
import { SectionNavigation, Stack, TabContent } from "../design-system";
import {
	accountSection,
	accountSectionParams,
	accountSections,
} from "../domain/account-navigation";
import { ClubShell } from "./club-shell";
import { MemberAdmin } from "./member-admin";
import { MemberAttendance } from "./member-attendance";
import { MemberFeedback } from "./member-feedback";
import { MemberProfile } from "./member-profile";
import { MemberProgress } from "./member-progress";

export const AccountScreen = (): ReactElement => {
	const person = useActivePerson();
	const router = useRouter();
	const params = useLocalSearchParams<{ tab?: string; feedback?: string }>();
	const tab = ["progress", "feedback", "attendance"].includes(params.tab ?? "")
		? (params.tab ?? "membership")
		: "membership";
	if (params.tab === "settings" || params.tab === "household")
		return (
			<Redirect
				href={{
					pathname: "/account-settings",
					params: {
						section: params.tab === "household" ? "household" : undefined,
					},
				}}
			/>
		);
	return (
		<ClubShell
			title="Account"
			subtitle={person.name}
			tabs={
				<SectionNavigation
					page
					hideLabel
					label="Account"
					value={tab}
					onValueChange={(value): void => router.setParams({ tab: value })}
					compactNavigation={{
						value: accountSection(tab, params.feedback),
						options: accountSections,
						onValueChange: (section): void =>
							router.setParams(accountSectionParams(section)),
					}}
					options={[
						{ value: "membership", label: "Membership" },
						{ value: "progress", label: "Progress" },
						{ value: "feedback", label: "Feedback" },
						{ value: "attendance", label: "Attendance" },
					]}
				/>
			}
		>
			<TabContent value={tab}>
				{tab === "attendance" ? (
					<MemberAttendance key={person.id} member={person} />
				) : tab === "feedback" ? (
					<MemberFeedback
						key={person.id}
						member={person}
						navigation="desktop"
					/>
				) : tab === "progress" ? (
					<MemberProgress key={person.id} member={person} />
				) : (
					<Stack key={person.id}>
						<MemberProfile member={person} />
						<MemberAdmin member={person} readOnly />
					</Stack>
				)}
			</TabContent>
		</ClubShell>
	);
};
