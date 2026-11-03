import type { ReactElement } from "react";
import {
	type SharedSessionPlanService,
	useLiveSharedSessionPlan,
	usePreviewSharedSessionPlan,
} from "../backend/use-session-plan";
import { useApp } from "../demo/app-state";
import {
	EmptyState,
	LoadingContent,
	SectionHeading,
	Stack,
	Surface,
} from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { SessionPlanDetails } from "./session-plan-details";

const SharedPlanContent = ({
	service,
	preview = false,
}: {
	service: SharedSessionPlanService;
	preview?: boolean;
}): ReactElement | undefined =>
	service.loading ? (
		<LoadingContent />
	) : service.plan ? (
		<Stack gap="sm">
			{!preview ? <SectionHeading>Plan</SectionHeading> : undefined}
			<Surface>
				<SessionPlanDetails plan={service.plan} />
			</Surface>
		</Stack>
	) : preview ? (
		<EmptyState title="Plan not published" />
	) : undefined;

const LiveSharedPlan = ({
	eventId,
	partId,
	preview,
}: {
	eventId: string;
	partId?: string;
	preview?: boolean;
}): ReactElement => (
	<SharedPlanContent
		service={useLiveSharedSessionPlan(eventId, partId)}
		preview={preview}
	/>
);
const PreviewSharedPlan = ({
	eventId,
	partId,
	preview,
}: {
	eventId: string;
	partId?: string;
	preview?: boolean;
}): ReactElement => (
	<SharedPlanContent
		service={usePreviewSharedSessionPlan(eventId, partId)}
		preview={preview}
	/>
);

export const SharedSessionPlan = ({
	event,
	partId,
	preview = false,
}: {
	event: ClubEvent;
	partId?: string;
	preview?: boolean;
}): ReactElement =>
	useApp().source === "convex" ? (
		<LiveSharedPlan eventId={event.id} partId={partId} preview={preview} />
	) : (
		<PreviewSharedPlan eventId={event.id} partId={partId} preview={preview} />
	);
