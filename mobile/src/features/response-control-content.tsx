import { type ReactElement, useRef, useState } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import { Select, Stack } from "../design-system";
import { canRegister, eventResponse } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import type { Response } from "../domain/club";
import { signupState } from "../domain/event-time";
import { responseOptions } from "./response-options";
import { SectionResponsePicker } from "./section-response-picker";
import { SeriesResponseControl } from "./series-response-control";

export const ResponseControlContent = ({
	event,
	personId,
	hideLabel = false,
	committed = false,
	loading = false,
}: {
	event: ClubEvent;
	personId?: string;
	hideLabel?: boolean;
	committed?: boolean;
	loading?: boolean;
}): ReactElement => {
	const { data, dispatch } = useApp();
	const activePerson = useActivePerson();
	const person =
		data.members.find((entry) => entry.id === personId) ?? activePerson;
	const [pending, setPending] = useState(false);
	const working = useRef(false);
	const current = eventResponse(data, event.id, person.id);
	const response = current.response;
	const signup = signupState(event, Date.now());
	const locked = Boolean(
		loading ||
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
				hideLabel={hideLabel}
				event={event}
				personId={person.id}
				unavailable={current.response === "unavailable"}
			/>
		);
	return (
		<Stack gap="xs">
			<Select
				compact={hideLabel}
				hideLabel={hideLabel}
				label={`${person.name} · ${event.kind === "tournament" ? "Interest" : "Attendance"}`}
				value={response}
				isDisabled={locked || pending}
				options={
					event.kind === "tournament"
						? [
								{
									value: "unanswered",
									label: "Respond",
									tone: "warning",
									isDisabled: true,
								},
								{ value: "going", label: "Interested", tone: "success" },
								{
									value: "unavailable",
									label: "Not interested",
									tone: "danger",
								},
							]
						: responseOptions({ full, response })
				}
				onValueChange={(value): void => {
					if (value === "going" || value === "unavailable") void respond(value);
				}}
			/>
			{response === "going" &&
			!committed &&
			event.kind !== "tournament" &&
			event.parts?.length ? (
				<SectionResponsePicker
					name={person.name}
					parts={event.parts}
					selected={current.partIds}
					disabled={locked || pending}
					onChange={(ids): void => {
						void respond("going", ids);
					}}
				/>
			) : undefined}
		</Stack>
	);
};
