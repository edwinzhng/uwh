import { useQuery } from "convex/react";
import { useAtomValue } from "jotai";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { previewSeasonLedgerAtom } from "../demo/season-ledger-state";
import { Stack } from "../design-system";
import type { Member } from "../domain/app-types";
import {
	defaultPreviewSeasonRecord,
	seasonRecordKey,
} from "../domain/preview-season-ledger";
import { SeasonRosterContent } from "./season-roster-content";
import { useSeason } from "./use-season";

type Props = { members: Member[]; section: string };

const LiveSeasonRosterPage = (props: Props): ReactElement => {
	const [season] = useSeason();
	const records = useQuery(api.season_records.summary, {
		seasonId: season,
		personIds: props.members.map((member) => member.id),
	});
	return (
		<SeasonRosterContent
			members={props.members}
			section={props.section}
			records={records}
		/>
	);
};

const LiveSeasonRoster = ({ members, section }: Props): ReactElement =>
	members.length ? (
		<Stack gap="sm">
			{Array.from({ length: Math.ceil(members.length / 40) }, (_, index) =>
				members.slice(index * 40, (index + 1) * 40),
			).map((page) => (
				<LiveSeasonRosterPage
					key={page.at(0)?.id}
					members={page}
					section={section}
				/>
			))}
		</Stack>
	) : (
		<SeasonRosterContent members={[]} section={section} records={[]} />
	);

const PreviewSeasonRoster = (props: Props): ReactElement => {
	const [season] = useSeason();
	const { data } = useApp();
	const ledger = useAtomValue(previewSeasonLedgerAtom);
	return (
		<SeasonRosterContent
			members={props.members}
			section={props.section}
			records={props.members.map(
				(member) =>
					ledger.records[seasonRecordKey(member.id, season)] ??
					defaultPreviewSeasonRecord(data, member.id, season),
			)}
		/>
	);
};

export const SeasonRoster = (props: Props): ReactElement =>
	useApp().source === "convex" ? (
		<LiveSeasonRoster members={props.members} section={props.section} />
	) : (
		<PreviewSeasonRoster members={props.members} section={props.section} />
	);
