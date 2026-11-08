import { useQuery } from "convex/react";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { AppContext, useActivePerson, useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	EmptyState,
	LoadingContent,
	Stack,
	usePageLoading,
} from "../design-system";
import { canCoach } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { practiceEvent } from "../domain/event-types";
import { TeamLineupPreview } from "./team-lineup-preview";

const EventPreviewContent = ({ event }: { event: ClubEvent }): ReactElement => {
	const { data, account } = useApp();
	const person = useActivePerson();
	const plans = data.teams.filter(
		(plan) => plan.eventId === event.id && plan.published,
	);
	return plans.length ? (
		<Stack>
			{plans.map((plan) => (
				<TeamLineupPreview
					key={`${plan.eventId}:${plan.partId ?? "all"}`}
					plan={plan}
					playerPersonId={canCoach(account) ? undefined : person.id}
				/>
			))}
		</Stack>
	) : (
		<EmptyState title="Teams not published" />
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
	const [open, setOpen] = useState(false);
	if (!available) return undefined;
	return (
		<>
			<Button
				label="Teams"
				accessibilityLabel={`Teams for ${event.title}`}
				variant="secondary"
				density="inline"
				compact
				onPress={(): void => setOpen(true)}
			/>
			<Dialog
				title="Teams"
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
	const available = useQuery(api.lineup.published, {
		eventId: event.id,
	});
	usePageLoading(available === undefined);
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
	if (!practiceEvent(event) || event.cancelled) return undefined;
	return source === "convex" ? (
		<LiveEventPreviewAction event={event} />
	) : (
		<EventPreviewActionContent
			event={event}
			available={data.teams.some(
				(plan) => plan.eventId === event.id && plan.published,
			)}
		/>
	);
};
