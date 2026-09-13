import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import {
	Button,
	EmptyState,
	Row,
	Stack,
	Surface,
	TabContent,
	Tabs,
	Text,
} from "../design-system";
import { canReadProgress } from "../domain/app-rules";
import { ClubShell } from "./club-shell";
import { InviteMemberAction } from "./invite-member-action";
import { MemberAdmin } from "./member-admin";
import { MemberProfileDetails } from "./member-profile-details";
import { MemberProgress } from "./member-progress";
import { PlayerCoachingPanel } from "./player-coaching-panel";

export const MemberScreen = (): ReactElement => {
	const params = useLocalSearchParams<{ id?: string; tab?: string }>();
	const { data, account, accounts } = useApp();
	const active = useActivePerson();
	const member = params.id
		? data.members.find((entry) => entry.id === params.id)
		: active;
	const router = useRouter();
	const setTab = (tab: string): void => router.setParams({ tab });
	const progress = member ? canReadProgress(account, member) : false;
	const tab = params.tab ?? (progress ? "progress" : "profile");
	const tabs: {
		value: string;
		label: string;
		staffRole?: "admin" | "coach";
	}[] = [
		{ value: "profile", label: "Profile" },
		...(progress ? [{ value: "progress", label: "Progress" }] : []),
		...(account.admin
			? [
					{
						value: "admin",
						label: "Admin",
						staffRole: "admin" as const,
					},
				]
			: []),
		...(account.coachPrograms.length
			? [
					{
						value: "coach",
						label: "Coach",
						staffRole: "coach" as const,
					},
				]
			: []),
	];
	const selectedTab = tabs.some((entry) => entry.value === tab)
		? tab
		: "profile";
	return (
		<ClubShell
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
				<>
					<TabContent value={selectedTab}>
						{selectedTab === "progress" ? (
							<MemberProgress member={member} />
						) : selectedTab === "coach" ? (
							<Stack gap="xl">
								<PlayerCoachingPanel personId={member.id} />
							</Stack>
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
												This roster profile has no linked login or parent
												account. Send an invitation to connect one.
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
				</>
			) : (
				<EmptyState
					title="Member unavailable"
					description="Return to People to choose another member."
				/>
			)}
		</ClubShell>
	);
};
