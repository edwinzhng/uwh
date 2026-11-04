import { useLocalSearchParams } from "expo-router";
import { type ReactElement, useState } from "react";
import {
	type SessionPerformanceService,
	useLiveSessionPerformance,
	usePreviewSessionPerformance,
} from "../backend/use-session-performance";
import { useApp } from "../demo/app-state";
import { InfiniteScroll, LoadingContent, Stack } from "../design-system";
import type { Member } from "../domain/app-types";
import { canWriteSessionPerformance } from "../domain/session-performance";
import { chronologicalSessionRatings } from "./session-feedback-view";
import { SessionPerformanceEditor } from "./session-performance-editor";
import { SessionRatingSection } from "./session-rating-section";
import { useReviewFlow } from "./use-review-flow";

const Reflections = ({
	member,
	service,
}: {
	member: Member;
	service: SessionPerformanceService;
}): ReactElement => {
	const { account } = useApp();
	const params = useLocalSearchParams<{ event?: string }>();
	const review = useReviewFlow();
	const [editor, setEditor] = useState<{ eventId?: string } | undefined>(
		review === "session-self-rating" ? { eventId: params.event } : undefined,
	);
	const entries = chronologicalSessionRatings(service.entries).filter(
		(entry) => entry.kind === "self",
	);
	const canAdd = canWriteSessionPerformance(account, member, "self");
	return (
		<Stack gap="lg">
			{service.loading ? (
				<LoadingContent />
			) : entries.length || canAdd ? (
				<SessionRatingSection
					title={
						account.personId === member.id
							? "Your reflections"
							: "Player reflections"
					}
					actionLabel="Reflect"
					entries={entries}
					onAdd={
						canAdd
							? (): void => setEditor({ eventId: params.event })
							: undefined
					}
					onEdit={(entry): void => setEditor({ eventId: entry.eventId })}
					report={service.report}
				/>
			) : undefined}
			{service.canLoadMore || service.loadingMore ? (
				<InfiniteScroll
					loadMore={service.loadMore}
					loading={service.loadingMore}
					revision={service.entries.length}
					disabled={false}
				/>
			) : undefined}
			{editor ? (
				<SessionPerformanceEditor
					personId={member.id}
					kind="self"
					initialEventId={editor.eventId}
					save={service.save}
					onClose={(): void => setEditor(undefined)}
				/>
			) : undefined}
		</Stack>
	);
};
const LiveReflections = ({ member }: { member: Member }): ReactElement => (
	<Reflections
		member={member}
		service={useLiveSessionPerformance(member.id, "self")}
	/>
);
const PreviewReflections = ({ member }: { member: Member }): ReactElement => (
	<Reflections
		member={member}
		service={usePreviewSessionPerformance(member.id, "self")}
	/>
);
export const SessionPerformance = ({
	member,
}: {
	member: Member;
}): ReactElement =>
	useApp().source === "convex" ? (
		<LiveReflections member={member} />
	) : (
		<PreviewReflections member={member} />
	);
