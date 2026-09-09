import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import {
	Button,
	Field,
	ListItem,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { ClubShell } from "./club-shell";
import { DataPage } from "./data-page";
import { SeasonRoster } from "./season-roster";
import { SeasonSelect } from "./season-select";
import { useSearchTerm } from "./use-search-term";
export const AdministrationScreen = (): ReactElement => {
	const { section = "home" } = useLocalSearchParams<{ section?: string }>();
	const { account, source } = useApp();
	const router = useRouter();
	const [search, setSearch] = useState("");
	const term = useSearchTerm(search);
	const go = (section: string): void =>
		router.push({ pathname: "/administration", params: { section } });
	return (
		<ClubShell
			title={
				section === "registration"
					? "Registration"
					: section === "payments"
						? "Payments"
						: "Admin"
			}
			staffRole={account.admin ? "admin" : undefined}
			back={
				<Row>
					<Button
						label={section === "home" ? "Club" : "Admin"}
						prefix="arrowLeft"
						variant="ghost"
						onPress={(): void =>
							router.navigate(section === "home" ? "/club" : "/administration")
						}
					/>
				</Row>
			}
		>
			{!account.admin ? (
				<Text>Administrator access required.</Text>
			) : section === "home" ? (
				<Surface padding="xs">
					<Stack gap="xs">
						<ListItem
							title="Registration"
							icon="users"
							onPress={(): void => go("registration")}
						/>
						<ListItem
							title="Payments"
							icon="layers"
							onPress={(): void => go("payments")}
						/>
						<ListItem
							title="Equipment"
							icon="archive"
							onPress={(): void => router.push("/equipment")}
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
						<ListItem
							title="Settings & access"
							icon="settings"
							onPress={(): void => router.push("/settings")}
						/>
					</Stack>
				</Surface>
			) : (
				<Stack>
					<SeasonSelect />
					<Field
						label="Search"
						value={search}
						onValueChange={setSearch}
						placeholder="Find a member"
					/>
					{source === "convex" ? (
						<DataPage
							config={{
								query: api.pages.members,
								args: { search: term },
								preview: [],
								size: 30,
							}}
						>
							{(items) => (
								<SeasonRoster
									members={items.map((item) => item.member)}
									section={section}
								/>
							)}
						</DataPage>
					) : (
						<Text>Season records are available in the connected app.</Text>
					)}
				</Stack>
			)}
		</ClubShell>
	);
};
