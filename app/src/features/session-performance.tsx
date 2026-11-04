import { useLocalSearchParams } from "expo-router";
import { type ReactElement, useState } from "react";
import {
	type SessionPerformanceService,
	useLiveSessionPerformance,
	usePreviewSessionPerformance,
} from "../backend/use-session-performance";
import { useApp } from "../demo/app-state";
import {
	Button,
	InfiniteScroll,
	LoadingContent,
	Row,
	SectionHeading,
	Stack,
	Surface,
} from "../design-system";
import { canCoachMember } from "../domain/app-rules";
import type { Member } from "../domain/app-types";
import type { SessionPerformanceKind } from "../domain/session-performance";
import { FeedbackEditor } from "./feedback-editor";
import { FeedbackList } from "./feedback-list";
import { MemberCoachNotes } from "./member-coach-notes";
import {
	chronologicalSessionRatings,
	sessionFeedbackActions,
} from "./session-feedback-view";
import { SessionPerformanceEditor } from "./session-performance-editor";
import { SessionRatingSection } from "./session-rating-section";
import { useReviewFlow } from "./use-review-flow";

const PerformanceContent = ({
	member,
	service,
	inlineNotes = false,
	visibleKind,
}: {
	member: Member;
	service: SessionPerformanceService;
	inlineNotes?: boolean;
	visibleKind?: SessionPerformanceKind;
}): ReactElement => {
	const { account } = useApp();
	const params = useLocalSearchParams<{ event?: string }>();
	const [noteOpen, setNoteOpen] = useState(false);
	const actions = sessionFeedbackActions(account, member);
	const review = useReviewFlow();
	const [editor, setEditor] = useState<
		{ kind: SessionPerformanceKind; eventId?: string } | undefined
	>(
		review === "session-self-rating"
			? { kind: "self", eventId: params.event }
			: review === "session-coach-rating"
				? { kind: "coach", eventId: params.event }
				: undefined,
	);
	return (
		<Stack gap="lg">
			{!inlineNotes && !visibleKind ? (
				<Row justify="end">
					<MemberCoachNotes
						member={member}
						onAdd={(): void => setNoteOpen(true)}
					/>
				</Row>
			) : undefined}
			{service.loading ? (
				<LoadingContent />
			) : (
				(["self", "coach"] as const)
					.filter(
						(kind) =>
							(!visibleKind || kind === visibleKind) &&
							(kind !== "coach" || canCoachMember(account, member)),
					)
					.map((kind) => {
						const entries = chronologicalSessionRatings(service.entries).filter(
							(entry) => entry.kind === kind,
						);
						const canAdd = actions.some((action) => action.id === kind);
						if (!entries.length && !canAdd && kind === "self") return undefined;
						return (
							<SessionRatingSection
								key={kind}
								title={
									kind === "self"
										? account.personId === member.id
											? "Your reflections"
											: "Player reflections"
										: "Coach ratings"
								}
								actionLabel={kind === "self" ? "Reflect" : "Add rating"}
								entries={entries}
								onAdd={
									canAdd
										? (): void => setEditor({ kind, eventId: params.event })
										: undefined
								}
								report={service.report}
								onEdit={(entry): void =>
									setEditor({ kind: entry.kind, eventId: entry.eventId })
								}
							/>
						);
					})
			)}
			{service.canLoadMore || service.loadingMore ? (
				<InfiniteScroll
					loadMore={service.loadMore}
					loading={service.loadingMore}
					revision={service.entries.length}
					disabled={false}
				/>
			) : undefined}
			{noteOpen && actions.some((action) => action.id === "note") ? (
				<FeedbackEditor
					personId={member.id}
					isOpen
					onOpenChange={setNoteOpen}
				/>
			) : undefined}
			{inlineNotes ? (
				<Surface elevation="none">
					<Stack gap="sm">
						<SectionHeading
							size="small"
							action={
								actions.some((action) => action.id === "note") ? (
									<Button
										label="Add feedback"
										roleTone="coach"
										compact
										variant="secondary"
										onPress={(): void => setNoteOpen(true)}
									/>
								) : undefined
							}
						>
							Feedback
						</SectionHeading>
						<FeedbackList
							personId={member.id}
							visibility="published"
							embedded
							compactEmpty
						/>
						{canCoachMember(account, member) ? (
							<FeedbackList
								personId={member.id}
								visibility="private"
								embedded
								hideEmpty
							/>
						) : undefined}
					</Stack>
				</Surface>
			) : undefined}
			{editor &&
			(editor.kind !== "coach" || canCoachMember(account, member)) ? (
				<SessionPerformanceEditor
					personId={member.id}
					kind={editor.kind}
					initialEventId={editor.eventId}
					save={service.save}
					onClose={(): void => setEditor(undefined)}
				/>
			) : undefined}
		</Stack>
	);
};
type Props = {
	member: Member;
	inlineNotes?: boolean;
	visibleKind?: SessionPerformanceKind;
};
const LivePerformance = ({
	member,
	inlineNotes,
	visibleKind,
}: Props): ReactElement => (
	<PerformanceContent
		member={member}
		service={useLiveSessionPerformance(member.id)}
		inlineNotes={inlineNotes}
		visibleKind={visibleKind}
	/>
);
const PreviewPerformance = ({
	member,
	inlineNotes,
	visibleKind,
}: Props): ReactElement => (
	<PerformanceContent
		member={member}
		service={usePreviewSessionPerformance(member.id)}
		inlineNotes={inlineNotes}
		visibleKind={visibleKind}
	/>
);
export const SessionPerformance = ({
	member,
	inlineNotes,
	visibleKind,
}: Props): ReactElement =>
	useApp().source === "convex" ? (
		<LivePerformance
			member={member}
			inlineNotes={inlineNotes}
			visibleKind={visibleKind}
		/>
	) : (
		<PreviewPerformance
			member={member}
			inlineNotes={inlineNotes}
			visibleKind={visibleKind}
		/>
	);
