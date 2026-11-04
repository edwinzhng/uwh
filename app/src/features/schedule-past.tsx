import { usePaginatedQuery } from "convex/react";
import { type ReactElement, useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { ScheduleEntry } from "../../convex/pages";
import { useApp } from "../demo/app-state";
import { HistorySection, LoadingContent } from "../design-system";
import { clubTimestamp } from "../domain/event-time";
import { eventFinished } from "../domain/schedule-agenda";
import { AgendaEntries } from "./schedule-entries";

type Props = { programId?: string; now: number };
const PastEntries = ({
	entries,
	loading,
	loadMore,
}: {
	entries: ScheduleEntry[];
	loading: boolean;
	loadMore?: () => void;
}): ReactElement | undefined => {
	if (!entries.length) return loading ? <LoadingContent /> : undefined;
	const chronological = entries
		.slice()
		.sort(
			(a, b) =>
				clubTimestamp(a.event.date, a.event.start, a.event.timeZone) -
					clubTimestamp(b.event.date, b.event.start, b.event.timeZone) ||
				a.event.id.localeCompare(b.event.id),
		);
	return (
		<HistorySection
			treatment="heading"
			loadMore={loadMore}
			loading={loading}
			revision={entries.length}
		>
			<AgendaEntries entries={chronological} past />
		</HistorySection>
	);
};
const LivePast = ({ programId, now }: Props): ReactElement | undefined => {
	const { results, status, loadMore } = usePaginatedQuery(
		api.schedule_agenda.historical,
		{ programId, now },
		{ initialNumItems: 1 },
	);
	const [target, setTarget] = useState(1);
	useEffect(() => {
		if (status === "CanLoadMore" && results.length < target)
			loadMore(Math.min(20, target - results.length));
	}, [status, results.length, target, loadMore]);
	return (
		<PastEntries
			entries={results}
			loading={
				status === "LoadingFirstPage" ||
				status === "LoadingMore" ||
				(results.length < target && status !== "Exhausted")
			}
			loadMore={
				status !== "Exhausted"
					? (): void => setTarget(results.length + 10)
					: undefined
			}
		/>
	);
};
const PreviewPast = ({ programId, now }: Props): ReactElement | undefined => {
	const { data } = useApp();
	const [count, setCount] = useState(1);
	const events = data.events
		.filter(
			(event) =>
				(!programId || event.program === programId) &&
				eventFinished(event, now),
		)
		.slice()
		.sort(
			(a, b) =>
				clubTimestamp(b.date, b.start, b.timeZone) -
					clubTimestamp(a.date, a.start, a.timeZone) ||
				b.id.localeCompare(a.id),
		);
	const entries = events.slice(0, count).map((event) => ({
		event,
		responses: data.responses.filter((row) => row.eventId === event.id),
	}));
	return (
		<PastEntries
			entries={entries}
			loading={false}
			loadMore={
				events.length > count
					? (): void => setCount((current) => current + 10)
					: undefined
			}
		/>
	);
};
export const SchedulePast = (props: Props): ReactElement | undefined => {
	const { source, workspaceId, account } = useApp();
	const scope = JSON.stringify([workspaceId, account.id, props.programId]);
	return source === "convex" ? (
		<LivePast key={scope} programId={props.programId} now={props.now} />
	) : (
		<PreviewPast key={scope} programId={props.programId} now={props.now} />
	);
};
