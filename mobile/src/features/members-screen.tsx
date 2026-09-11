import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useActivePerson, useApp } from "../demo/app-state";
import {
	Button,
	Field,
	List,
	ListItem,
	Row,
	Stack,
	Surface,
	TabContent,
	Tabs,
} from "../design-system";
import { memberRoles } from "../domain/app-rules";
import { ClubShell } from "./club-shell";
import { DataPage } from "./data-page";
import { InviteList } from "./invite-list";
import { MemberEditor } from "./member-editor";
import { useSearchTerm } from "./use-search-term";

export const MembersScreen = (): ReactElement => {
	const { data, account, accounts } = useApp();
	const active = useActivePerson();
	const router = useRouter();
	const params = useLocalSearchParams<{ tab?: string }>();
	const tab = account.admin && params.tab === "invites" ? "invites" : "members";
	const [search, setSearch] = useState("");
	const term = useSearchTerm(search);
	const [add, setAdd] = useState(false);
	const members = data.members.filter((member) =>
		member.name.toLowerCase().includes(search.toLowerCase()),
	);
	return (
		<ClubShell
			tabs={
				account.admin ? (
					<Tabs
						page
						label="Members"
						hideLabel
						value={tab}
						onValueChange={(tab): void => router.setParams({ tab })}
						options={[
							{ value: "members", label: "Members" },
							{ value: "invites", label: "Invites" },
						]}
					/>
				) : undefined
			}
			title="Members"
			action={
				account.admin ? (
					<Button
						label="Invite member"
						staffRole="admin"
						prefix="plus"
						onPress={(): void => setAdd(true)}
					/>
				) : undefined
			}
		>
			<TabContent value={tab}>
				{tab === "invites" ? (
					<InviteList />
				) : (
					<>
						<Surface padding="xs">
							<ListItem
								title={
									active.id === account.personId
										? "My profile"
										: `${active.name.split(" ").at(0)}’s profile`
								}
								avatar={active.name}
								onPress={(): void => router.push("/member")}
							/>
						</Surface>
						<Stack gap="sm">
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
									args: { search: term },
									preview: members.map((member) => ({
										member,
										roles: memberRoles(member, accounts),
									})),
								}}
							>
								{(items) => (
									<Surface padding="xs">
										<List>
											{items.map(({ member, roles }) => (
												<ListItem
													key={member.id}
													title={member.name}
													avatar={member.name}
													description={roles}
													onPress={() =>
														router.push({
															pathname: "/member",
															params: { id: member.id },
														})
													}
												/>
											))}
											{!items.length ? (
												<ListItem title="No members found" />
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
					onInvited={(): void => router.setParams({ tab: "invites" })}
				/>
			) : undefined}
		</ClubShell>
	);
};
