import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	Avatar,
	Badge,
	Button,
	LoadingContent,
	Row,
	SectionHeading,
	Stack,
	Text,
} from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { maxPracticeCoaches } from "../domain/coaching-hours";
import {
	type EventCoachControls,
	useLiveEventCoaches,
	usePreviewEventCoaches,
} from "./use-event-coaches";

const EventCoachList = ({
	event,
	controls,
}: {
	event: ClubEvent;
	controls: EventCoachControls;
}): ReactElement => (
	<Stack gap="sm">
		{controls.loading ? (
			<LoadingContent />
		) : (
			<Stack gap="sm">
				<SectionHeading
					action={
						<Badge
							label={`${controls.assignments.length} selected`}
							kind="neutral"
						/>
					}
				>
					Coaches
				</SectionHeading>
				<Row gap="xs" wrap>
					{controls.coaches.map((coach) => {
						const selected = controls.assignments.some(
							(entry) => entry.coachId === coach.coachId,
						);
						return (
							<Button
								key={coach.coachId}
								label={coach.name}
								leading={
									<Avatar name={coach.name} personId={coach.personId} mini />
								}
								variant="selection"
								round
								compact
								isSelected={selected}
								isLoading={controls.busy}
								isDisabled={
									event.cancelled ||
									(!selected &&
										controls.assignments.length >= maxPracticeCoaches)
								}
								onPress={(): void => {
									void controls.change({
										coachId: coach.coachId,
										assigned: !selected,
									});
								}}
							/>
						);
					})}
				</Row>
			</Stack>
		)}
		{controls.error ? <Text tone="danger">{controls.error}</Text> : undefined}
	</Stack>
);
type Props = { event: ClubEvent; partId?: string };
const LiveEventCoaches = ({ event, partId }: Props): ReactElement => (
	<EventCoachList
		event={event}
		controls={useLiveEventCoaches(event.id, partId)}
	/>
);
const PreviewEventCoaches = ({ event, partId }: Props): ReactElement => (
	<EventCoachList
		event={event}
		controls={usePreviewEventCoaches(event, partId)}
	/>
);
export const EventCoaches = ({
	event,
	partId,
}: Props): ReactElement | undefined => {
	const { source, account } = useApp();
	if (
		!account.coachPrograms.length ||
		event.kind === "social" ||
		event.kind === "meeting"
	)
		return undefined;
	return source === "convex" ? (
		<LiveEventCoaches event={event} partId={partId} />
	) : (
		<PreviewEventCoaches event={event} partId={partId} />
	);
};
