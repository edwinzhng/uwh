import { useQuery } from "convex/react";
import { useAtomValue } from "jotai";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { previewSessionSeries } from "../demo/session-series-state";
import type { ClubEvent } from "../domain/app-types";
import { ResponseControlContent } from "./response-control-content";

type Props = { event: ClubEvent; personId?: string; hideLabel?: boolean };
const LiveResponse = ({ event, personId, hideLabel }: Props): ReactElement => {
	const series = useQuery(
		api.session_series.list,
		event.seriesId ? {} : "skip",
	);
	const committed = Boolean(
		series?.some((entry) => entry.seriesIds.includes(event.seriesId ?? "")),
	);
	return (
		<ResponseControlContent
			event={event}
			personId={personId}
			hideLabel={hideLabel}
			committed={committed}
			loading={Boolean(event.seriesId && !series)}
		/>
	);
};
const PreviewResponse = ({
	event,
	personId,
	hideLabel,
}: Props): ReactElement => {
	const series = useAtomValue(previewSessionSeries);
	return (
		<ResponseControlContent
			event={event}
			personId={personId}
			hideLabel={hideLabel}
			committed={series.some((entry) =>
				entry.seriesIds.includes(event.seriesId ?? ""),
			)}
		/>
	);
};
export const ResponseControl = ({
	event,
	personId,
	hideLabel,
}: Props): ReactElement =>
	useApp().source === "convex" ? (
		<LiveResponse event={event} personId={personId} hideLabel={hideLabel} />
	) : (
		<PreviewResponse event={event} personId={personId} hideLabel={hideLabel} />
	);
