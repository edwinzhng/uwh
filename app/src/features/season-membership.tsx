import type { ReactElement, ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import { useSeasonRecord } from "../backend/use-season-record";
import { useApp } from "../demo/app-state";
import { usePreviewSeasonRecord } from "../demo/season-ledger-state";
import { DataPage } from "./data-page";
import { PreviewSeasonHistory } from "./preview-season-history";
import { SeasonHistory } from "./season-history";
import { SeasonMembershipContent } from "./season-membership-content";
import { useSeason } from "./use-season";

type Props = { personId: string; editable: boolean; children?: ReactNode };

const LiveSeasonMembership = (props: Props): ReactElement => {
	const [season] = useSeason();
	return (
		<SeasonMembershipContent
			personId={props.personId}
			editable={props.editable}
			controller={useSeasonRecord(props.personId, season)}
			history={
				<DataPage
					config={{
						query: api.season_records.history,
						args: { personId: props.personId, seasonId: season },
						preview: [],
						size: 20,
					}}
				>
					{(entries) => (
						<SeasonHistory
							entries={entries.map((entry) => ({ ...entry, id: entry._id }))}
						/>
					)}
				</DataPage>
			}
		>
			{props.children}
		</SeasonMembershipContent>
	);
};

const PreviewSeasonMembership = (props: Props): ReactElement => {
	const [season] = useSeason();
	return (
		<SeasonMembershipContent
			personId={props.personId}
			editable={props.editable}
			controller={usePreviewSeasonRecord(props.personId, season)}
			history={
				<PreviewSeasonHistory personId={props.personId} seasonId={season} />
			}
		>
			{props.children}
		</SeasonMembershipContent>
	);
};

export const SeasonMembership = (props: Props): ReactElement =>
	useApp().source === "convex" ? (
		<LiveSeasonMembership personId={props.personId} editable={props.editable}>
			{props.children}
		</LiveSeasonMembership>
	) : (
		<PreviewSeasonMembership
			personId={props.personId}
			editable={props.editable}
		>
			{props.children}
		</PreviewSeasonMembership>
	);
