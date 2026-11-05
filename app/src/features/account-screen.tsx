import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useActivePerson } from "../demo/app-state";
import { Stack, TabContent, Tabs, useRouteSelection } from "../design-system";
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
import { PersonalFitness } from "./personal-fitness";

export const AccountScreen = (): ReactElement => {
	const person = useActivePerson();
	const router = useRouter();
	const params = useLocalSearchParams<{ tab?: string; feedback?: string }>();
	const selection = useRouteSelection(
		accountSection(params.tab ?? "membership", params.feedback),
		(value): void => router.setParams(accountSectionParams(value)),
		person.id,
	);
	const tab = selection.value;
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
				<Tabs
					page
					hideLabel
					label="Account"
					value={tab}
					onValueChange={selection.select}
					options={accountSections}
				/>
			}
		>
			<TabContent value={tab}>
				{tab === "attendance" ? (
					<MemberAttendance key={person.id} member={person} />
				) : tab === "feedback" ? (
					<MemberFeedback key={person.id} member={person} />
				) : tab === "fitness" ? (
					<PersonalFitness key={person.id} member={person} full />
				) : tab === "goals" ? (
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
