import { type ReactElement, useRef, useState } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import { Select } from "../design-system";
import { canRegister, eventResponse } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import type { Response } from "../domain/club";
import { signupState } from "../domain/event-time";
import { responseOptions } from "./response-options";
import { SeriesResponseControl } from "./series-response-control";

export const ResponseControl = ({
	event,
	personId,
}: {
	event: ClubEvent;
	personId?: string;
}): ReactElement => {
	const { data, dispatch } = useApp();
	const activePerson = useActivePerson();
	const person =
		data.members.find((entry) => entry.id === personId) ?? activePerson;
	const [pending, setPending] = useState(false);
	const working = useRef(false);
	const current = eventResponse(data, event.id, person.id);
	const response = current.response;
	const part =
		current.partIds?.length === 1
			? event.parts?.find((entry) => entry.id === current.partIds?.at(0))
			: undefined;
	const signup = signupState(event, Date.now());
	const locked = Boolean(
		event.cancelled ||
			signup === "scheduled" ||
			signup === "closed" ||
			!canRegister(person, event),
	);
	const full =
		data.responses.filter(
			(entry) =>
				entry.eventId === event.id &&
				(entry.response === "going" || entry.seriesExpected),
		).length >= (event.capacity ?? Infinity);
	const respond = async (
		value: Response,
		partIds?: string[],
	): Promise<void> => {
		if (working.current || locked) return;
		working.current = true;
		setPending(true);
		await dispatch({
			type: "respond",
			eventId: event.id,
			personId: person.id,
			response: value,
			partIds,
		});
		working.current = false;
		setPending(false);
	};
	if (current.seriesExpected)
		return (
			<SeriesResponseControl
				event={event}
				personId={person.id}
				unavailable={current.response === "unavailable"}
			/>
		);
	return (
		<Select
			label={event.kind === "tournament" ? "Availability" : "Status"}
			value={response === "going" && part ? `part:${part.id}` : response}
			isDisabled={locked || pending}
			options={
				event.kind === "tournament"
					? [
							{ value: "unanswered", label: "Not responded", isDisabled: true },
							{ value: "going", label: "Available" },
							{ value: "unavailable", label: "Unavailable" },
						]
					: responseOptions({ full, response, parts: event.parts, part })
			}
			onValueChange={(value): void => {
				const part = event.parts?.find((part) => value === `part:${part.id}`);
				if (part) {
					void respond("going", [part.id]);
					return;
				}
				if (value === "going" || value === "unavailable") void respond(value);
			}}
		/>
	);
};
