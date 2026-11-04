import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import {
	Button,
	EmptyState,
	type RoleTone,
	Row,
	Stack,
	Surface,
	TabContent,
	Tabs,
	Text,
} from "../design-system";
import { canReadProgress } from "../domain/app-rules";
import { ClubShell } from "./club-shell";
import { FeedbackList } from "./feedback-list";
import { GuardianInviteAction } from "./guardian-invite-action";
import { InviteMemberAction } from "./invite-member-action";
import { MemberAdmin } from "./member-admin";
import { MemberAttendance } from "./member-attendance";
import { MemberFeedback } from "./member-feedback";
import { MemberLifecycleAction } from "./member-lifecycle-action";
import { MemberMergeAction } from "./member-merge-action";
import { MemberProfileDetails } from "./member-profile-details";
import { MemberProgress } from "./member-progress";
import { PersonalFitness } from "./personal-fitness";
import { RecognitionSummary } from "./recognition-summary";
import { ShoutoutEditor } from "./shoutout-editor";

export const MemberScreen = (): ReactElement => {
	const params = useLocalSearchParams<{
		id?: string;
		tab?: string;
		feedback?: string;
	}>();
	const { data, account, accounts } = useApp();
	const active = useActivePerson();
	const member = params.id
		? data.members.find((entry) => entry.id === params.id)
		: active;
	const router = useRouter();
	const setTab = (tab: string): void =>
		router.setParams({ tab, feedback: undefined });
	const progress = member ? canReadProgress(account, member) : false;
	const tab =
		params.tab === "progress"
			? "fitness"
			: params.tab === "feedback" && params.feedback === "self"
				? "goals"
				: (params.tab ?? (progress ? "fitness" : "profile"));
	const tabs: {
		value: string;
		label: string;
		roleTone?: RoleTone;
	}[] = [
		{ value: "profile", label: "Profile" },
		{ value: "shoutouts", label: "Shoutouts" },
		...(progress
			? [
					{ value: "fitness", label: "Fitness" },
					{ value: "goals", label: "Goals & reflections" },
					{ value: "feedback", label: "Feedback" },
					{ value: "attendance", label: "Attendance" },
				]
			: []),
		...(account.admin
			? [
					{
						value: "admin",
						label: "Admin",
						roleTone: "admin" as const,
					},
				]
			: []),
	];
	const selectedTab = tabs.some((entry) => entry.value === tab)
		? tab
		: "profile";
	if (member?.mergedInto)
		return (
			<Redirect
				href={{
					pathname: "/member",
					params: {
						id: member.mergedInto,
						...(params.tab ? { tab: params.tab } : {}),
					},
				}}
			/>
		);
	return (
		<ClubShell
			roleTone={selectedTab === "admin" ? "admin" : undefined}
			action={
				account.admin && member && selectedTab === "admin" ? (
					<Row gap="xs" justify="end" wrap>
						<MemberLifecycleAction member={member} compact />
						<MemberMergeAction member={member} />
						<GuardianInviteAction member={member} />
					</Row>
				) : undefined
			}
			tabs={
				<Tabs
					page
					label="Member"
					hideLabel
					value={selectedTab}
					onValueChange={setTab}
					options={tabs}
				/>
			}
			title={member?.name ?? "Member not found"}
			back={
				<Row>
					<Button
						label="Members"
						prefix="arrowLeft"
						variant="ghost"
						onPress={(): void => router.navigate("/members")}
					/>
				</Row>
			}
		>
			{member ? (
				<TabContent key={member.id} value={selectedTab}>
					{selectedTab === "shoutouts" ? (
						<Stack gap="sm">
							<Row justify="end">
								<ShoutoutEditor personId={member.id} />
							</Row>
							<RecognitionSummary personId={member.id} />
							<FeedbackList
								key={member.id}
								personId={member.id}
								visibility="published"
								kind="shoutout"
							/>
						</Stack>
					) : selectedTab === "fitness" ? (
						<PersonalFitness member={member} full />
					) : selectedTab === "goals" ? (
						<MemberProgress member={member} />
					) : selectedTab === "feedback" ? (
						<MemberFeedback member={member} />
					) : selectedTab === "attendance" ? (
						<MemberAttendance key={member.id} member={member} />
					) : selectedTab === "admin" ? (
						<Stack gap="xl">
							<MemberAdmin key={member.id} member={member} />
							{!accounts.some(
								(entry) =>
									entry.personId === member.id ||
									entry.children.includes(member.id),
							) ? (
								<Surface header={<Text variant="h4">Account access</Text>}>
									<Stack>
										<Text variant="small" tone="secondary">
											This roster profile has no linked login or parent account.
											Send an invitation to connect one.
										</Text>
										<Row>
											<InviteMemberAction
												key={member.id}
												personId={member.id}
												name={member.name}
											/>
										</Row>
									</Stack>
								</Surface>
							) : undefined}
						</Stack>
					) : (
						<MemberProfileDetails member={member} />
					)}
				</TabContent>
			) : (
				<EmptyState title="Member unavailable" />
			)}
		</ClubShell>
	);
};
