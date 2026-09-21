import { type ReactElement, useMemo } from "react";
import { api } from "../../convex/_generated/api";
import { AppContext, useApp } from "../demo/app-state";
import type { ClubEvent } from "../domain/app-types";
import type { EventTypeFilter } from "../domain/event-types";
import { DataPage } from "./data-page";
import { ScheduleEvents } from "./schedule-events";
export const SchedulePage = ({
	eventType = "all",
	audience,
	view,
	period,
	date,
	season,
	now,
	preview,
}: {
	eventType?: EventTypeFilter;
	audience: "household" | "all";
	view: "upcoming" | "past" | "calendar";
	period: "upcoming" | "past";
	date: string;
	season: string;
	now: number;
	preview: ClubEvent[];
}): ReactElement => {
	const app = useApp();
	const args = useMemo(
		() => ({ view, date, season, now, period, audience, eventType }),
		[audience, date, eventType, now, period, season, view],
	);
	const config = useMemo(
		() => ({
			query: api.pages.schedule,
			args,
			preview: preview.map((event) => ({
				event,
				responses: app.data.responses.filter((row) => row.eventId === event.id),
			})),
			size: 20,
		}),
		[app.data.responses, args, preview],
	);
	return (
		<DataPage config={config}>
			{(items) => (
				<AppContext.Provider
					value={{
						...app,
						data: {
							...app.data,
							events: items.map((item) => item.event),
							responses: items.flatMap((item) => item.responses),
						},
					}}
				>
					<ScheduleEvents events={items.map((item) => item.event)} />
				</AppContext.Provider>
			)}
		</DataPage>
	);
};
