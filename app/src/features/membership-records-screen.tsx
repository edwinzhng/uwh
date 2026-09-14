import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { Button, Field, Row, Stack, Text } from "../design-system";
import { ClubShell } from "./club-shell";
import { DataPage } from "./data-page";
import { SeasonRoster } from "./season-roster";
import { SeasonSelect } from "./season-select";
import { useSearchTerm } from "./use-search-term";
export const MembershipRecordsScreen = ({
	section,
}: {
	section: "registration" | "payments";
}): ReactElement => {
	const { account, source } = useApp();
	const router = useRouter();
	const [search, setSearch] = useState("");
	const term = useSearchTerm(search);
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
						label="Club"
						prefix="arrowLeft"
						variant="ghost"
						onPress={(): void => router.navigate("/club")}
					/>
				</Row>
			}
		>
			{!account.admin ? (
				<Text>Administrator access required.</Text>
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
