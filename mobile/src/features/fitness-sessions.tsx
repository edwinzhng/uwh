import { usePaginatedQuery } from "convex/react";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Button, ListItem, Row, Stack, Surface, Text } from "../design-system";
import { FitnessSessionForm } from "./fitness-session-form";
export const FitnessSessions = ({
	test,
	seasonId,
	onSelect,
}: {
	test: Doc<"fitnessTests">;
	seasonId: string;
	onSelect: (id: Id<"fitnessSessions">) => void;
}): ReactElement => {
	const sessions = usePaginatedQuery(
		api.fitness.sessions,
		{ testId: test._id, seasonId },
		{ initialNumItems: 20 },
	);
	const [creating, setCreating] = useState(false);
	return (
		<Stack>
			{!test.archived ? (
				<Row justify="end">
					<Button
						label="New session"
						icon="plus"
						onPress={(): void => setCreating(true)}
					/>
				</Row>
			) : undefined}
			<Surface padding="xs">
				<Stack gap="xs">
					{sessions.results.map((session) => (
						<ListItem
							key={session._id}
							title={session.date}
							description={`${session.resultCount} results`}
							onPress={(): void => onSelect(session._id)}
						/>
					))}
					{!sessions.results.length ? (
						<Text tone="secondary">
							{sessions.status === "LoadingFirstPage"
								? "Loading…"
								: "No sessions this season."}
						</Text>
					) : undefined}
				</Stack>
			</Surface>
			{sessions.status === "CanLoadMore" ? (
				<Button
					label="More sessions"
					variant="secondary"
					onPress={(): void => sessions.loadMore(20)}
				/>
			) : undefined}
			{creating ? (
				<FitnessSessionForm
					testId={test._id}
					seasonId={seasonId}
					onClose={(): void => setCreating(false)}
					onSaved={onSelect}
				/>
			) : undefined}
		</Stack>
	);
};
