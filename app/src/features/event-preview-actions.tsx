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
	Tabs,
} from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { practiceEvent } from "../domain/event-types";
import { TeamPool } from "./team-pool";

const EventPreviewContent = ({ event }: { event: ClubEvent }): ReactElement => {
	const { data } = useApp();
	const person = useActivePerson();
	const plans = data.teams.filter(
		(plan) => plan.eventId === event.id && plan.published,
	);
	const [selected, setSelected] = useState(
		plans.find((plan) => !plan.partId)
			? "all"
			: (event.parts?.at(0)?.id ?? "all"),
	);
	const plan = plans.find(
		(plan) => plan.partId === (selected === "all" ? undefined : selected),
	);
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
	return (
		<Stack>
			{event.parts?.length ? (
				<Tabs
					label="Practice section"
					hideLabel
					value={selected}
					options={[
						...(plans.some((plan) => !plan.partId)
							? [{ value: "all", label: "All" }]
							: []),
						...event.parts.map((part) => ({
							value: part.id,
							label: part.title,
						})),
					]}
					onValueChange={setSelected}
				/>
			) : undefined}
			{plan && side ? (
				<TeamPool plan={plan} side={side} group={group} />
			) : (
				<EmptyState
					title={plan ? "You’re not in this lineup" : "Teams not published"}
					description={
						plan
							? `No team has been assigned to ${person.name} for this session.`
							: "Your team will appear here once the coach publishes it."
					}
				/>
			)}
		</Stack>
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
export const EventPreviewActions = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement | undefined => {
	const { source } = useApp();
	const [open, setOpen] = useState(false);
	if (!practiceEvent(event)) return undefined;
	return (
		<>
			<Button
				label="My team"
				accessibilityLabel={`My team for ${event.title}`}
				variant="ghost"
				compact
				onPress={(): void => setOpen(true)}
			/>
			<Dialog
				title="My team"
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
