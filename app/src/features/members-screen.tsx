import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useActivePerson, useApp } from "../demo/app-state";
import {
	Button,
	EmptyState,
	Field,
	List,
	ListItem,
	Row,
	SegmentedControl,
	Stack,
	Surface,
	TabContent,
	Tabs,
	useRouteSelection,
} from "../design-system";
import { memberRoles } from "../domain/app-rules";
import { ClubShell } from "./club-shell";
import { DataPage } from "./data-page";
import { InviteList } from "./invite-list";
import { MemberEditor } from "./member-editor";
import { PlayerRankings } from "./player-rankings";
import { useSearchTerm } from "./use-search-term";

export const MembersScreen = (): ReactElement => {
	const { data, account, accounts } = useApp();
	const active = useActivePerson();
	const router = useRouter();
	const params = useLocalSearchParams<{ tab?: string; status?: string }>();
	const staff = account.admin || account.coachPrograms.length > 0;
	const tabSelection = useRouteSelection(params.tab ?? "members", (tab): void =>
		router.setParams({ tab }),
	);
	const statusSelection = useRouteSelection(
		params.status ?? "active",
		(status): void => router.setParams({ status }),
	);
	const archived = staff && statusSelection.value === "archived";
	const tab =
		account.coachPrograms.length > 0 &&
		["rankings", "matchmaking"].includes(tabSelection.value)
			? "matchmaking"
			: account.admin && tabSelection.value === "invites"
				? "invites"
				: "members";
	const [search, setSearch] = useState("");
	const term = useSearchTerm(search);
	const [add, setAdd] = useState(false);
	const members = data.members.filter(
		(member) =>
			Boolean(member.archived) === archived &&
			member.name.toLowerCase().includes(search.toLowerCase()),
	);
	return (
		<ClubShell
			roleTone={
				tab === "matchmaking"
					? "coach"
					: tab === "invites"
						? "admin"
						: undefined
			}
			tabs={
				staff ? (
					<Tabs
						page
						label="Members"
						hideLabel
						value={tab}
						onValueChange={tabSelection.select}
						options={[
							{ value: "members", label: "Members" },
							...(account.coachPrograms.length > 0
								? [
										{
											value: "matchmaking",
											label: "Matchmaking",
											roleTone: "coach" as const,
										},
									]
								: []),
							...(account.admin
								? [
										{
											value: "invites",
											label: "Invites",
											roleTone: "admin" as const,
										},
									]
								: []),
						]}
					/>
				) : undefined
			}
			title="Members"
			action={
				account.admin ? (
					<Button
						label="Invite member"
						roleTone="admin"
						prefix="plus"
						onPress={(): void => setAdd(true)}
					/>
				) : undefined
			}
		>
			<TabContent value={tab}>
				{tab === "matchmaking" ? (
					<PlayerRankings />
				) : tab === "invites" ? (
					<InviteList />
				) : (
					<>
						<Surface>
							<ListItem
								title={
									active.id === account.personId
										? "My profile"
										: `${active.name.split(" ").at(0)}’s profile`
								}
								avatar={active.name}
								avatarId={active.id}
								onPress={(): void => router.push("/member")}
							/>
						</Surface>
						<Stack gap="sm">
							{staff ? (
								<SegmentedControl
									label="Roster"
									value={archived ? "archived" : "active"}
									onValueChange={statusSelection.select}
									options={[
										{ value: "active", label: "Active" },
										{ value: "archived", label: "Archived" },
									]}
								/>
							) : undefined}
							<Row justify="between" wrap>
								<Stack grow>
									<Field
										label="Search"
										value={search}
										onValueChange={setSearch}
										placeholder="Find a member"
									/>
								</Stack>
							</Row>
							<DataPage
								config={{
									query: api.pages.members,
									args: { search: term, archived },
									preview: members.map((member) => ({
										member,
										roles: memberRoles(member, accounts),
									})),
								}}
							>
								{(items) => (
									<Surface>
										<List>
											{items.map(({ member }) => (
												<ListItem
													key={member.id}
													title={member.name}
													avatar={member.name}
													avatarId={member.id}
													onPress={() =>
														router.push({
															pathname: "/member",
															params: { id: member.id },
														})
													}
												/>
											))}
											{!items.length ? (
												<EmptyState
													title={
														archived
															? "No archived members"
															: "No members found"
													}
												/>
											) : undefined}
										</List>
									</Surface>
								)}
							</DataPage>
						</Stack>
					</>
				)}
			</TabContent>
			{account.admin && add ? (
				<MemberEditor
					open={add}
					onClose={(): void => setAdd(false)}
					onInvited={(): void => tabSelection.select("invites")}
				/>
			) : undefined}
		</ClubShell>
	);
};
