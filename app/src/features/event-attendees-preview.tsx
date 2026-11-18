import { useQuery } from "convex/react";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { Dialog, EmptyState, LoadingContent, TextLink } from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { RoleViewWorkspace } from "./role-view-scope";
import { SessionPeople } from "./session-people";

type Props = { event: ClubEvent; attendanceCount?: number };
const UnavailableParticipants = (): ReactElement => (
	<EmptyState
		title="Event unavailable"
		description="Close this sheet and reopen the schedule."
	/>
);
const PreviewParticipants = ({
	eventId,
}: {
	eventId: string;
}): ReactElement => {
	const { data } = useApp();
	const event = data.events.find((entry) => entry.id === eventId);
	return event ? <SessionPeople event={event} /> : <UnavailableParticipants />;
};
const LiveParticipants = ({ eventId }: { eventId: string }): ReactElement => {
	const app = useApp();
	const workspace = useQuery(api.club.current, {
		screen: "session",
		id: eventId,
	});
	const event = workspace?.data.events.find((entry) => entry.id === eventId);
	return workspace === undefined ? (
		<LoadingContent />
	) : !workspace ||
		!event ||
		workspace.clubId !== app.workspaceId ||
		workspace.account.id !== app.account.id ? (
		<UnavailableParticipants />
	) : (
		<RoleViewWorkspace
			app={{ ...app, data: workspace.data, account: workspace.account }}
		>
			<SessionPeople event={event} />
		</RoleViewWorkspace>
	);
};
const AttendeesAction = ({ event, attendanceCount }: Props): ReactElement => {
	const { source } = useApp();
	const [open, setOpen] = useState(false);
	return (
		<>
			<TextLink
				compact
				inline
				highlightOnHover={false}
				label={
					attendanceCount === undefined
						? "Attendees"
						: `${attendanceCount} attending`
				}
				role="button"
				accessibilityLabel={`${attendanceCount === undefined ? "Participants for" : `${attendanceCount} attending`} ${event.title}. View participants`}
				onPress={(): void => setOpen(true)}
			/>
			<Dialog
				title="Participants"
				isOpen={open}
				onOpenChange={setOpen}
				intent="detail"
			>
				{open ? (
					source === "convex" ? (
						<LiveParticipants key={event.id} eventId={event.id} />
					) : (
						<PreviewParticipants key={event.id} eventId={event.id} />
					)
				) : undefined}
			</Dialog>
		</>
	);
};
export const EventAttendeesPreview = (props: Props): ReactElement => {
	const { account, workspaceId } = useApp();
	return (
		<AttendeesAction
			key={`${workspaceId ?? "preview"}:${account.id}:${props.event.id}`}
			event={props.event}
			attendanceCount={props.attendanceCount}
		/>
	);
};
