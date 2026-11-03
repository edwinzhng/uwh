import { type ReactElement, useState } from "react";
import {
	type SessionPlanService,
	useLiveSessionPlan,
	usePreviewSessionPlan,
} from "../backend/use-session-plan";
import { useApp } from "../demo/app-state";
import {
	Badge,
	Button,
	EmptyState,
	LoadingContent,
	Row,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { SessionPlanDetails } from "./session-plan-details";
import { SessionPlanEditor } from "./session-plan-editor";
import { SessionPlanPublication } from "./session-plan-publication";
import { useReviewFlow } from "./use-review-flow";

const PlanContent = ({
	event,
	partId,
	service,
}: {
	event: ClubEvent;
	partId?: string;
	service: SessionPlanService;
}): ReactElement => {
	const [open, setOpen] = useState(useReviewFlow() === "session-plan");
	const plan = service.plan;
	return (
		<Stack gap="sm">
			<SectionHeading
				action={
					<Row wrap gap="xs">
						<Button
							label="Edit plan"
							prefix="edit"
							variant="secondary"
							isDisabled={event.cancelled || service.loading}
							onPress={(): void => setOpen(true)}
						/>
						{plan ? (
							<SessionPlanPublication
								eventId={event.id}
								partId={partId}
								plan={plan}
								publish={service.publish}
								disabled={Boolean(event.cancelled) || service.loading || open}
							/>
						) : undefined}
					</Row>
				}
			>
				Session plan
			</SectionHeading>
			{service.loading || !plan ? (
				<LoadingContent />
			) : (
				<>
					<Badge
						label={
							plan.published
								? "Published to eligible households"
								: "Private draft"
						}
					/>
					<SessionPlanDetails plan={plan} />
					{plan.notes ? (
						<Surface header={<Text variant="h4">Private coaching notes</Text>}>
							<Text>{plan.notes}</Text>
						</Surface>
					) : undefined}
					{!plan.body &&
					!plan.goals &&
					!plan.objective &&
					!plan.notes &&
					!plan.drills.length ? (
						<Surface>
							<EmptyState
								title="No session plan yet"
								description="Write a plan and goals for this session."
							/>
						</Surface>
					) : undefined}
					{open ? (
						<SessionPlanEditor
							event={event}
							partId={partId}
							plan={plan}
							save={service.save}
							onClose={(): void => setOpen(false)}
						/>
					) : undefined}
				</>
			)}
		</Stack>
	);
};
const LivePlan = ({
	event,
	partId,
}: {
	event: ClubEvent;
	partId?: string;
}): ReactElement => (
	<PlanContent
		event={event}
		partId={partId}
		service={useLiveSessionPlan(event.id, partId)}
	/>
);
const PreviewPlan = ({
	event,
	partId,
}: {
	event: ClubEvent;
	partId?: string;
}): ReactElement => (
	<PlanContent
		event={event}
		partId={partId}
		service={usePreviewSessionPlan(event.id, partId)}
	/>
);
export const SessionPlanSection = ({
	event,
	partId,
}: {
	event: ClubEvent;
	partId?: string;
}): ReactElement =>
	useApp().source === "convex" ? (
		<LivePlan event={event} partId={partId} />
	) : (
		<PreviewPlan event={event} partId={partId} />
	);
