import { useQuery } from "convex/react";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import {
	Stack,
	TeamAssignmentPill,
	Text,
	usePageLoading,
} from "../design-system";
import { eventResponse } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { canCreateEventLineup } from "../domain/event-lineups";
import {
	type HomeLineupAssignment,
	homeLineupAssignments,
	homeLineupLabel,
} from "../domain/home-lineup";

const AssignmentList = ({
	assignments,
	published,
}: {
	assignments: HomeLineupAssignment[];
	published: boolean;
}): ReactElement => (
	<Stack gap="xs">
		{assignments.length ? (
			assignments.map((assignment) => (
				<Stack key={assignment.partId ?? "practice"} gap="xxs">
					{assignments.length > 1 && assignment.partName ? (
						<Text variant="small" tone="secondary">
							{assignment.partName}
						</Text>
					) : undefined}
					<TeamAssignmentPill
						team={assignment.team}
						label={homeLineupLabel(assignment)}
					/>
				</Stack>
			))
		) : (
			<Text variant="small" tone="secondary">
				{published ? "No lineup assignment" : "Lineup not published yet"}
			</Text>
		)}
	</Stack>
);

const LiveLineup = ({
	eventId,
	personId,
}: {
	eventId: string;
	personId: string;
}): ReactElement | undefined => {
	const assignments = useQuery(api.lineup.homeAssignments, { eventId })?.filter(
		(entry) => entry.personId === personId,
	);
	const needsPublished = assignments?.length === 0;
	const published = useQuery(
		api.lineup.published,
		needsPublished ? { eventId } : "skip",
	);
	const loading =
		assignments === undefined || (needsPublished && published === undefined);
	usePageLoading(loading);
	return loading ? undefined : (
		<AssignmentList assignments={assignments} published={published === true} />
	);
};

export const HomePracticeLineup = ({
	event,
	personId,
}: {
	event: ClubEvent;
	personId: string;
}): ReactElement => {
	const { data, source } = useApp();
	return source === "convex" ? (
		<LiveLineup eventId={event.id} personId={personId} />
	) : (
		<AssignmentList
			published={data.teams.some(
				(plan) =>
					plan.eventId === event.id &&
					plan.published &&
					canCreateEventLineup(event, plan.partId),
			)}
			assignments={homeLineupAssignments(
				event,
				data.teams,
				personId,
				eventResponse(data, event.id, personId),
			)}
		/>
	);
};
