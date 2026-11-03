import { useQuery } from "convex/react";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { AppContext, useActivePerson, useApp } from "../demo/app-state";
import { Button, Dialog, EmptyState, LoadingContent } from "../design-system";
import { eventResponse } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { publishedEventLineups } from "../domain/event-lineups";
import { eventResponsePresentation } from "../domain/event-response-presentation";
import { practiceEvent } from "../domain/event-types";
import { TeamPool } from "./team-pool";

const EventPreviewContent = ({ event }: { event: ClubEvent }): ReactElement => {
	const { data } = useApp();
	const person = useActivePerson();
	const plan = publishedEventLineups(
		event,
		data.teams,
		person.id,
		eventResponse(data, event.id, person.id),
	).at(0);
	const side =
		plan && [...plan.black, ...(plan.blackBench ?? [])].includes(person.id)
			? "black"
			: plan && [...plan.white, ...(plan.whiteBench ?? [])].includes(person.id)
				? "white"
				: undefined;
	const group = plan?.separateYouth
		? (plan.assignments?.find((entry) => entry.personId === person.id)
				?.ageGroup ?? "adult")
		: "combined";
	return plan && side ? (
		<TeamPool plan={plan} side={side} group={group} />
	) : (
		<EmptyState
			title="Lineup unavailable"
			description="Your team will appear here once the coach publishes it."
		/>
	);
};
const LiveEventPreview = ({ eventId }: { eventId: string }): ReactElement => {
	const app = useApp();
	const workspace = useQuery(api.club.current, {
		screen: "session",
		id: eventId,
	});
	const event = workspace?.data.events.find((entry) => entry.id === eventId);
	return workspace === undefined ? (
		<LoadingContent />
	) : !workspace || !event || workspace.clubId !== app.workspaceId ? (
		<EmptyState
			title="Event unavailable"
			description="Close this preview and reopen the schedule."
		/>
	) : (
		<AppContext.Provider
			value={{ ...app, data: workspace.data, account: workspace.account }}
		>
			<EventPreviewContent event={event} />
		</AppContext.Provider>
	);
};
const EventPreviewActionContent = ({
	event,
	available,
}: {
	event: ClubEvent;
	available: boolean;
}): ReactElement | undefined => {
	const { source } = useApp();
	const person = useActivePerson();
	const [open, setOpen] = useState(false);
	if (!available) return undefined;
	return (
		<>
			<Button
				label="Lineup"
				accessibilityLabel={`Lineup for ${person.name} · ${event.title}`}
				variant="secondary"
				compact
				onPress={(): void => setOpen(true)}
			/>
			<Dialog
				title="Lineup"
				isOpen={open}
				onOpenChange={setOpen}
				intent="detail"
			>
				{open ? (
					source === "convex" ? (
						<LiveEventPreview key={event.id} eventId={event.id} />
					) : (
						<EventPreviewContent key={event.id} event={event} />
					)
				) : undefined}
			</Dialog>
		</>
	);
};
const LiveEventPreviewAction = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement => {
	const person = useActivePerson();
	const available = useQuery(api.lineup.available, {
		eventId: event.id,
		personId: person.id,
	});
	return (
		<EventPreviewActionContent event={event} available={available === true} />
	);
};
export const EventPreviewActions = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement | undefined => {
	const { source, data } = useApp();
	const person = useActivePerson();
	if (
		!practiceEvent(event) ||
		event.cancelled ||
		!eventResponsePresentation(eventResponse(data, event.id, person.id)).lineup
	)
		return undefined;
	return source === "convex" ? (
		<LiveEventPreviewAction event={event} />
	) : (
		<EventPreviewActionContent
			event={event}
			available={
				publishedEventLineups(
					event,
					data.teams,
					person.id,
					eventResponse(data, event.id, person.id),
				).length > 0
			}
		/>
	);
};
