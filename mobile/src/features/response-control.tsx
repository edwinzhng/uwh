import { type ReactElement, useRef, useState } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import { Select, Stack, Text } from "../design-system";
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
	const response = eventResponse(data, event.id, person.id).response;
	const signup = signupState(event, Date.now());
	const reason = event.cancelled
		? "Event cancelled"
		: signup === "scheduled"
			? "Registration not open yet"
			: signup === "closed"
				? "Registration closed"
				: !canRegister(person, event)
					? "Registration restricted"
					: undefined;
	const full =
		data.responses.filter(
			(entry) => entry.eventId === event.id && entry.response === "going",
		).length >= event.capacity;
	const respond = async (value: Response): Promise<void> => {
		if (working.current || reason) return;
		working.current = true;
		setPending(true);
		await dispatch({
			type: "respond",
			eventId: event.id,
			personId: person.id,
			response: value,
		});
		working.current = false;
		setPending(false);
	};
	return (
		<Stack gap="xxs">
			<Select
				label="Status"
				value={reason ? "locked" : response}
				isDisabled={Boolean(reason) || pending}
				options={
					reason
						? [{ value: "locked", label: reason }]
						: [
								{
									value: "unanswered",
									label: "Not responded",
									tone: "warning",
								},
								{
									value: "going",
									tone: full && response !== "going" ? "warning" : "success",
									label:
										full && response !== "going" ? "Join waitlist" : "Going",
								},
								...(response === "waiting"
									? [
											{
												value: "waiting",
												label: "Waitlisted",
												tone: "warning" as const,
												isDisabled: true,
											},
										]
									: []),
								{ value: "unavailable", label: "Not going", tone: "danger" },
							]
				}
				onValueChange={(value): void => {
					if (
						value === "going" ||
						value === "unavailable" ||
						value === "unanswered"
					)
						void respond(value);
				}}
			/>
			{reason && response !== "unanswered" ? (
				<Text variant="caption" tone="secondary">
					{response === "going"
						? "Going"
						: response === "waiting"
							? "Waitlisted"
							: "Not going"}
				</Text>
			) : undefined}
		</Stack>
	);
};
