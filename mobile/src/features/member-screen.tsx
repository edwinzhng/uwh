import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import {
	Avatar,
	Button,
	Row,
	SegmentedControl,
	Stack,
	StaffSection,
	Surface,
	Text,
} from "../design-system";
import { canReadProgress, memberRoles } from "../domain/app-rules";
import { ClubShell } from "./club-shell";
import { InviteMemberAction } from "./invite-member-action";
import { MemberAdmin } from "./member-admin";
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
	const tabs = [
		{ value: "profile", label: "Profile" },
		...(progress ? [{ value: "progress", label: "Progress" }] : []),
		...(account.admin ? [{ value: "admin", label: "Admin" }] : []),
		...(account.coachPrograms.length
			? [{ value: "coach", label: "Coach" }]
			: []),
	];
	const selectedTab = tabs.some((entry) => entry.value === tab)
		? tab
		: "profile";
	return (
		<ClubShell
			title={member?.name ?? "Member not found"}
			subtitle={member ? memberRoles(member, accounts) : undefined}
			action={
				account.admin &&
				member &&
				!accounts.some((entry) => entry.personId === member.id) ? (
					<InviteMemberAction
						key={member.id}
						personId={member.id}
						name={member.name}
					/>
				) : undefined
			}
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
					<SegmentedControl
						label="Member"
						hideLabel
						value={selectedTab}
						onValueChange={setTab}
						options={tabs}
					/>
					{selectedTab === "progress" ? (
						<MemberProgress member={member} />
					) : selectedTab === "coach" ? (
						<StaffSection staffRole="coach">
							<PlayerCoachingPanel personId={member.id} />
						</StaffSection>
					) : selectedTab === "admin" ? (
						<StaffSection staffRole="admin">
							<MemberAdmin key={member.id} member={member} />
						</StaffSection>
					) : (
						<Surface>
							<Stack>
								<Row>
									<Avatar name={member.name} />
									<Stack gap="xxs">
										<Text variant="h4">{member.name}</Text>
										<Text variant="small" tone="secondary">
											{memberRoles(member, accounts)}
										</Text>
									</Stack>
								</Row>

								{progress ? (
									<Row>
										<Button
											label="View progress"
											prefix="target"
											variant="secondary"
											onPress={(): void => setTab("progress")}
										/>
									</Row>
								) : undefined}
							</Stack>
						</Surface>
					)}
				</>
			) : (
				<Text variant="small" tone="secondary">
					Choose another member.
				</Text>
			)}
		</ClubShell>
	);
};
