import { type ReactElement, useRef, useState } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import { Select } from "../design-system";
import { canRegister, eventResponse } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import type { Response } from "../domain/club";
import { signupState } from "../domain/event-time";

export const ResponseControl = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement => {
	const { data, dispatch } = useApp();
	const person = useActivePerson();
	const [pending, setPending] = useState(false);
	const working = useRef(false);
	const current = eventResponse(data, event.id, person.id);
	const response =
		current.response === "unanswered" ? "unavailable" : current.response;
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
			(entry) => entry.eventId === event.id && entry.response === "going",
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
	return (
		<Select
			label="Status"
			value={response === "going" && part ? `part:${part.id}` : response}
			isDisabled={locked || pending}
			options={[
				{
					value: "going",
					tone: full && response !== "going" ? "warning" : "success",
					label:
						full && response !== "going"
							? "Join waitlist"
							: event.parts?.length
								? "Going · Both"
								: "Going",
				},
				...(event.parts ?? []).map((part) => ({
					value: `part:${part.id}`,
					label: `${part.title} only`,
					tone:
						full && response !== "going"
							? ("warning" as const)
							: ("success" as const),
				})),
				...(response === "waiting"
					? [
							{
								value: "waiting",
								label: part ? `Waitlisted · ${part.title}` : "Waitlisted",
								tone: "warning" as const,
								isDisabled: true,
							},
						]
					: []),
				{ value: "unavailable", label: "Absent", tone: "danger" },
			]}
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
