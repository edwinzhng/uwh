import { type ReactElement, useState } from "react";
import { EventResponseRow, List, Text } from "../design-system";
import type { ClubEvent, EventResponse } from "../domain/app-types";
import { eventTimeRange } from "../domain/event-card-presentation";
import { changedPartResponse, partResponse } from "../domain/schedule-agenda";
import { QuickResponseButtons } from "./quick-response-buttons";
import { SeriesResponseControl } from "./series-response-control";

export const PartResponseControls = ({
	event,
	current,
	name,
	disabled,
	full,
	partId,
	hideLabel = false,
	isPending,
	onRespond,
}: {
	event: ClubEvent;
	current: EventResponse;
	name: string;
	disabled: boolean;
	full: boolean;
	partId?: string;
	hideLabel?: boolean;
	isPending: () => boolean;
	onRespond: (
		response: "going" | "unavailable" | "unanswered",
		partIds?: string[],
		declinedPartIds?: string[],
	) => Promise<void>;
}): ReactElement => {
	const [absence, setAbsence] = useState(false);
	const parts = event.parts?.filter(
		(part) => partId === undefined || part.id === partId,
	);
	return (
		<>
			<List gap="xs">
				{parts?.map((part) => {
					const response = partResponse(current, part.id);
					const buttons = (
						<QuickResponseButtons
							key={part.id}
							name={`${name} · ${part.title}`}
							response={response}
							full={full}
							disabled={disabled}
							onRespond={(going): void => {
								if (
									disabled ||
									isPending() ||
									(going && response === "going") ||
									(!going && response === "unavailable")
								)
									return;
								const next = changedPartResponse(
									event,
									current,
									part.id,
									going,
								);
								if (current.seriesExpected && next.response === "unavailable")
									setAbsence(true);
								else
									void onRespond(
										next.response,
										next.partIds,
										next.declinedPartIds,
									);
							}}
						/>
					);
					return partId !== undefined && hideLabel ? (
						buttons
					) : (
						<EventResponseRow
							key={part.id}
							label={part.title}
							description={eventTimeRange(part.start, part.end)}
							tone={
								response === "going"
									? "success"
									: response === "unavailable"
										? "danger"
										: response === "waiting"
											? "warning"
											: "neutral"
							}
						>
							{buttons}
						</EventResponseRow>
					);
				})}
			</List>
			{absence ? (
				<SeriesResponseControl
					event={event}
					personId={current.personId}
					unavailable={current.response === "unavailable"}
					dialogOnly
					onClose={(): void => setAbsence(false)}
				/>
			) : undefined}
			{current.response === "waiting" ? (
				<Text variant="caption" tone="warning">
					Section choices are confirmed when a space becomes available.
				</Text>
			) : undefined}
		</>
	);
};
