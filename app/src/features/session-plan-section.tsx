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
}): ReactElement | undefined => {
	const [open, setOpen] = useState(useReviewFlow() === "session-plan");
	const plan = service.plan;
	if (
		!service.loading &&
		(!plan || (!plan.body && !plan.notes && !plan.media.length)) &&
		!open
	)
		return undefined;
	return (
		<Stack gap="heading">
			<SectionHeading
				badge={
					plan?.published ? <Badge label="Published" compact /> : undefined
				}
				action={
					<Row wrap gap="xs">
						<Button
							label="Edit"
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
				Plan
			</SectionHeading>
			{service.loading || !plan ? (
				<LoadingContent />
			) : (
				<Stack gap="section">
					{plan.body || plan.media.length ? (
						<Surface>
							<SessionPlanDetails plan={plan} />
						</Surface>
					) : undefined}
					{plan.notes ? (
						<Stack gap="heading">
							<SectionHeading>Private coaching notes</SectionHeading>
							<Surface>
								<Text variant="small">{plan.notes}</Text>
							</Surface>
						</Stack>
					) : undefined}
					{!plan.body && !plan.notes && !plan.media.length ? (
						<EmptyState title="No plan" />
					) : undefined}
					{open ? (
						<SessionPlanEditor
							event={event}
							partId={partId}
							plan={plan}
							save={service.save}
							images={service.images}
							onClose={(): void => setOpen(false)}
						/>
					) : undefined}
				</Stack>
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
