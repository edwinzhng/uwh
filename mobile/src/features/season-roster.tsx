import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { Badge, ListItem, Stack, Surface, Text } from "../design-system";
import { money } from "../domain/app-rules";
import type { Member } from "../domain/app-types";
import { useSeason } from "./use-season";
export const SeasonRoster = ({
	members,
	section,
}: {
	members: Member[];
	section: string;
}): ReactElement => {
	const [season] = useSeason();
	const router = useRouter();
	const records = useQuery(api.season_records.summary, {
		seasonId: season,
		personIds: members.map((member) => member.id),
	});
	return (
		<Surface padding="xs">
			<Stack gap="xs">
				{!records ? (
					<Text>Loading…</Text>
				) : (
					members.map((member) => {
						const record = records.find(
							(record) => record.personId === member.id,
						);
						const due = (record?.due ?? 0) - (record?.paid ?? 0);
						return (
							<ListItem
								key={member.id}
								title={member.name}
								avatar={member.name}
								description={
									record?.registration === "approved"
										? "Approved"
										: record?.registration === "submitted"
											? "Awaiting review"
											: "Missing registration"
								}
								trailing={
									<Badge
										label={
											section === "registration"
												? `CUGA: ${record?.cuga ? "Yes" : "No"}`
												: due > 0
													? `${money(due)} due`
													: due < 0
														? `${money(-due)} credit`
														: "Settled"
										}
										kind={
											due > 0 && section !== "registration"
												? "warning"
												: "neutral"
										}
									/>
								}
								onPress={(): void =>
									router.push({
										pathname: "/member",
										params: { id: member.id, tab: "admin" },
									})
								}
							/>
						);
					})
				)}
				{records && !members.length ? (
					<Text>No members found.</Text>
				) : undefined}
			</Stack>
		</Surface>
	);
};
