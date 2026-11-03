import { type ReactElement, useState } from "react";
import { FitnessData } from "../backend/fitness-data";
import {
	Button,
	EmptyState,
	InfiniteScroll,
	List,
	ListItem,
	LoadingContent,
	Row,
	Stack,
	Surface,
} from "../design-system";
import type { FitnessTest } from "../domain/fitness-model";
import { FitnessSessionForm } from "./fitness-session-form";
export const FitnessSessions = ({
	test,
	seasonId,
	onSelect,
}: {
	test: FitnessTest;
	seasonId: string;
	onSelect: (id: string) => void;
}): ReactElement => {
	const [creating, setCreating] = useState(false);
	return (
		<FitnessData request={{ type: "sessions", testId: test._id, seasonId }}>
			{({ sessions }) => (
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
						<List>
							{sessions.results.map((session) => (
								<ListItem
									key={session._id}
									title={session.date}
									description={`${session.resultCount} results`}
									onPress={(): void => onSelect(session._id)}
								/>
							))}
							{!sessions.results.length ? (
								sessions.status === "LoadingFirstPage" ? (
									<LoadingContent />
								) : (
									<EmptyState
										title="No sessions this season"
										description="Add a session to record this test’s results."
									/>
								)
							) : undefined}
						</List>
					</Surface>
					{sessions.status === "CanLoadMore" ||
					sessions.status === "LoadingMore" ? (
						<InfiniteScroll
							loadMore={(): void => sessions.loadMore(20)}
							loading={sessions.status === "LoadingMore"}
							revision={sessions.results.length}
							disabled={false}
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
			)}
		</FitnessData>
	);
};
