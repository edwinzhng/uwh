import { useQuery } from "convex/react";
import { useAtomValue } from "jotai";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { previewSessionSeries } from "../demo/session-series-state";
import type { ClubEvent } from "../domain/app-types";
import { ResponseControlContent } from "./response-control-content";

type Props = {
	event: ClubEvent;
	personId?: string;
	partId?: string;
	hideLabel?: boolean;
	firstDivider?: boolean;
	quick?: boolean;
	compactRows?: boolean;
};
const LiveResponse = ({
	event,
	personId,
	partId,
	hideLabel,
	firstDivider,
	quick,
	compactRows,
}: Props): ReactElement => {
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
			partId={partId}
			hideLabel={hideLabel}
			firstDivider={firstDivider}
			quick={quick}
			compactRows={compactRows}
			committed={committed}
			loading={Boolean(event.seriesId && !series)}
		/>
	);
};
const PreviewResponse = ({
	event,
	personId,
	partId,
	hideLabel,
	firstDivider,
	quick,
	compactRows,
}: Props): ReactElement => {
	const series = useAtomValue(previewSessionSeries);
	return (
		<ResponseControlContent
			event={event}
			personId={personId}
			partId={partId}
			hideLabel={hideLabel}
			firstDivider={firstDivider}
			quick={quick}
			compactRows={compactRows}
			committed={series.some((entry) =>
				entry.seriesIds.includes(event.seriesId ?? ""),
			)}
		/>
	);
};
export const ResponseControl = ({
	event,
	personId,
	partId,
	hideLabel,
	firstDivider,
	quick,
	compactRows,
}: Props): ReactElement =>
	useApp().source === "convex" ? (
		<LiveResponse
			event={event}
			personId={personId}
			partId={partId}
			hideLabel={hideLabel}
			firstDivider={firstDivider}
			quick={quick}
			compactRows={compactRows}
		/>
	) : (
		<PreviewResponse
			event={event}
			personId={personId}
			partId={partId}
			hideLabel={hideLabel}
			firstDivider={firstDivider}
			quick={quick}
			compactRows={compactRows}
		/>
	);
