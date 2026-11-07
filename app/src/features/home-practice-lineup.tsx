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
import {
	type HomeLineupAssignment,
	homeLineupAssignments,
	homeLineupLabel,
} from "../domain/home-lineup";

const AssignmentList = ({
	assignments,
}: {
	assignments: HomeLineupAssignment[];
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
				Lineup not available.
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
	const assignments = useQuery(api.lineup.homeAssignments, { eventId });
	usePageLoading(assignments === undefined);
	return assignments === undefined ? undefined : (
		<AssignmentList
			assignments={assignments.filter((entry) => entry.personId === personId)}
		/>
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
			assignments={homeLineupAssignments(
				event,
				data.teams,
				personId,
				eventResponse(data, event.id, personId),
			)}
		/>
	);
};
