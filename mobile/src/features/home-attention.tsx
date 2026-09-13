import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useSetAtom } from "jotai";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { selectedPersonAtom, useApp } from "../demo/app-state";
import {
	List,
	ListItem,
	SectionHeading,
	Stack,
	Surface,
} from "../design-system";
import { balance, money } from "../domain/app-rules";
import { clubDate } from "../domain/event-time";
import { householdMembers } from "../domain/home";
import type { SeasonRecord } from "../domain/season-ledger";
import { useSeason } from "./use-season";

type AttentionRecord = Pick<
	SeasonRecord,
	"personId" | "registration" | "due" | "paid"
>;
const AttentionRows = ({
	records,
	seasonId,
}: {
	records: AttentionRecord[];
	seasonId?: string;
}): ReactElement | undefined => {
	const { data, account } = useApp();
	const [, selectSeason] = useSeason();
	const select = useSetAtom(selectedPersonAtom);
	const router = useRouter();
	const items = records.filter(
		(record) => record.registration === "missing" || record.due > record.paid,
	);
	if (!items.length) return undefined;
	return (
		<Stack gap="sm">
			<SectionHeading size="small">Needs attention</SectionHeading>
			<Surface padding="xs">
				<List>
					{items.map((record) => {
						const person = data.members.find(
							(member) => member.id === record.personId,
						);
						return (
							<ListItem
								key={record.personId}
								title={`${record.personId === account.personId ? "You" : (person?.name ?? "Member")} · ${record.registration === "missing" ? "Review membership" : "Payment outstanding"}`}
								description={[
									record.registration === "missing"
										? "Registration incomplete"
										: undefined,
									record.due > record.paid
										? `${money(record.due - record.paid)} due`
										: undefined,
								]
									.filter(Boolean)
									.join(" · ")}
								onPress={(): void => {
									select(record.personId);
									if (seasonId) selectSeason(seasonId);
									router.push("/membership");
								}}
							/>
						);
					})}
				</List>
			</Surface>
		</Stack>
	);
};
const LiveHomeAttention = (): ReactElement => {
	const { data } = useApp();
	const today = clubDate(undefined, data.timeZone);
	const seasonId = data.seasons.find(
		(season) => season.start <= today && season.end >= today,
	)?.id;
	const records = useQuery(
		api.home_records.household,
		seasonId ? { seasonId } : "skip",
	);
	return <AttentionRows records={records ?? []} seasonId={seasonId} />;
};
export const HomeAttention = (): ReactElement => {
	const { data, account, source } = useApp();
	return source === "convex" ? (
		<LiveHomeAttention />
	) : (
		<AttentionRows
			records={householdMembers(data, account).map((person) => ({
				personId: person.id,
				registration: person.registration,
				due: Math.max(0, balance(data, person.id)),
				paid: 0,
			}))}
		/>
	);
};
