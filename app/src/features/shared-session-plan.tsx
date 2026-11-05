import type { ReactElement } from "react";
import {
	type SharedSessionPlanService,
	useLiveSharedSessionPlan,
	usePreviewSharedSessionPlan,
} from "../backend/use-session-plan";
import { useApp } from "../demo/app-state";
import {
	Badge,
	EmptyState,
	LoadingContent,
	SectionHeading,
	Stack,
	Surface,
} from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { practicePartKey } from "../domain/practice-parts";
import { ContentReport } from "./content-report";
import { SessionPlanDetails } from "./session-plan-details";

const SharedPlanContent = ({
	service,
	preview = false,
	planKey,
}: {
	service: SharedSessionPlanService;
	preview?: boolean;
	planKey: string;
}): ReactElement | undefined =>
	service.loading ? (
		<LoadingContent />
	) : service.plan ? (
		<Stack gap="heading">
			{!preview ? (
				<SectionHeading badge={<Badge label="Published" compact />}>
					Plan
				</SectionHeading>
			) : undefined}
			<Surface>
				<SessionPlanDetails plan={service.plan} />
				<ContentReport
					source={{
						kind: "sessionPlan",
						id: planKey,
						revision: service.plan.revision,
					}}
					label="Report plan"
				/>
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
		planKey={practicePartKey(eventId, partId)}
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
		planKey={practicePartKey(eventId, partId)}
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
