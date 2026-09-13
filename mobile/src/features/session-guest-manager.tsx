import { useMutation } from "convex/react";
import { useSetAtom } from "jotai";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { previewDataAtom, useApp } from "../demo/app-state";
import { Button, Select, Stack, Surface, Text } from "../design-system";
import { canRegister } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { clubTimestamp } from "../domain/event-time";
import { useFormTask } from "./use-form-task";

type GuestChange = { eventId: string; personId: string; attending: boolean };
const GuestForm = ({
	event,
	save,
}: {
	event: ClubEvent;
	save: (args: GuestChange) => Promise<void>;
}): ReactElement => {
	const { data } = useApp();
	const [personId, setPersonId] = useState<string>();
	const task = useFormTask();
	const candidates = data.members.filter(
		(person) =>
			canRegister(person, event) &&
			!data.responses.some(
				(response) =>
					response.eventId === event.id &&
					response.personId === person.id &&
					response.seriesExpected,
			),
	);
	const current = data.responses.find(
		(response) =>
			response.eventId === event.id && response.personId === personId,
	);
	const attending = current?.response === "going";
	return (
		<Surface header={<Text variant="h4">Session guests</Text>}>
			<Stack>
				<Text variant="small" tone="secondary">
					Add a player for this session only. Committed places stay reserved,
					including reported absences. If needed, edit this session’s capacity
					before adding a guest.
				</Text>
				<Select
					label="Guest player"
					value={personId}
					options={candidates.map((person) => ({
						value: person.id,
						label: person.name,
					}))}
					isDisabled={task.busy}
					onValueChange={(value): void => {
						setPersonId(value);
						task.clear();
					}}
				/>
				<Button
					label={attending ? "Remove session guest" : "Add session guest"}
					variant="secondary"
					isLoading={task.busy}
					onPress={(): void => {
						void task.submit(
							() => (!personId ? "Choose a guest player." : undefined),
							async () => {
								if (personId)
									await save({
										eventId: event.id,
										personId,
										attending: !attending,
									});
							},
						);
					}}
				/>
				{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
			</Stack>
		</Surface>
	);
};
const LiveGuests = ({ event }: { event: ClubEvent }): ReactElement => {
	const save = useMutation(api.session_series.guest);
	return (
		<GuestForm
			event={event}
			save={async (args) => {
				await save(args);
			}}
		/>
	);
};
const PreviewGuests = ({ event }: { event: ClubEvent }): ReactElement => {
	const setData = useSetAtom(previewDataAtom);
	const { data } = useApp();
	return (
		<GuestForm
			event={event}
			save={async (args) => {
				const occupied = data.responses.filter(
					(response) =>
						response.eventId === args.eventId &&
						response.personId !== args.personId &&
						(response.response === "going" || response.seriesExpected),
				).length;
				if (args.attending && occupied >= (event.capacity ?? Infinity))
					throw new Error(
						"No unreserved places. Increase this session’s capacity before adding a guest.",
					);
				setData((current) => ({
					...current,
					responses: [
						...current.responses.filter(
							(response) =>
								!(
									response.eventId === args.eventId &&
									response.personId === args.personId
								),
						),
						{
							...current.responses.find(
								(response) =>
									response.eventId === args.eventId &&
									response.personId === args.personId,
							),
							eventId: args.eventId,
							personId: args.personId,
							response: args.attending ? "going" : "unavailable",
							attendance:
								current.responses.find(
									(response) =>
										response.eventId === args.eventId &&
										response.personId === args.personId,
								)?.attendance ?? "unmarked",
						},
					],
				}));
			}}
		/>
	);
};
export const SessionGuestManager = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement | undefined => {
	const { account, source } = useApp();
	if (
		!account.admin ||
		!event.seriesId ||
		event.cancelled ||
		clubTimestamp(event.date, event.end, event.timeZone) <= Date.now()
	)
		return undefined;
	return source === "convex" ? (
		<LiveGuests event={event} />
	) : (
		<PreviewGuests event={event} />
	);
};
