import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Text } from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { displayDateTime } from "../domain/date-display";
import { signupState } from "../domain/event-time";
import { useEventNow } from "./use-event-now";

export const SignupWindow = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement | undefined => {
	const { data } = useApp();
	const state = signupState(event, useEventNow(event));
	const deadline = state === "scheduled" ? event.opensAt : event.closesAt;
	if (event.cancelled || deadline === undefined) return undefined;
	return (
		<Text variant="caption" tone={state === "open" ? "warning" : "secondary"}>
			{state === "scheduled"
				? "Responses open"
				: state === "closed"
					? "Responses closed"
					: "Respond by"}{" "}
			{displayDateTime(deadline, event.timeZone ?? data.timeZone)}
		</Text>
	);
};
