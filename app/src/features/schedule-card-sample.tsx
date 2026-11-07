import { type ReactElement, useState } from "react";
import { AppContext, useActivePerson, useApp } from "../demo/app-state";
import type { ScheduleDateLayout } from "../design-system";
import { reduceApp } from "../domain/app-reducer";
import type {
	AppAction,
	AppData,
	ClubEvent,
	EventResponse,
} from "../domain/app-types";
import { HouseholdEventCard } from "./household-event-card";

type State =
	| "past"
	| "going"
	| "unanswered"
	| "unavailable"
	| "partial"
	| "waiting"
	| "cancelled";
export const ScheduleCardSample = ({
	event,
	state,
	dateLayout,
}: {
	event: ClubEvent;
	state: State;
	dateLayout: ScheduleDateLayout;
}): ReactElement => {
	const app = useApp();
	const person = useActivePerson();
	const [data, setData] = useState<AppData>(() => ({
		...app.data,
		responses: [
			...app.data.responses.filter(
				(entry) => entry.eventId !== event.id || entry.personId !== person.id,
			),
			{
				eventId: event.id,
				personId: person.id,
				response:
					state === "past" || state === "partial"
						? "going"
						: state === "cancelled"
							? "unanswered"
							: state,
				partIds: state === "partial" ? ["training"] : undefined,
				declinedPartIds: state === "partial" ? ["hockey"] : undefined,
				attendance: "unmarked",
			} satisfies EventResponse,
		],
	}));
	const dispatch = async (action: AppAction): Promise<boolean> => {
		setData(reduceApp(data, app.account, action));
		return true;
	};
	return (
		<AppContext value={{ ...app, data, dispatch }}>
			<HouseholdEventCard
				event={state === "cancelled" ? { ...event, cancelled: true } : event}
				past={state === "past"}
				attendanceCount={6}
				dateLayout={dateLayout}
			/>
		</AppContext>
	);
};
