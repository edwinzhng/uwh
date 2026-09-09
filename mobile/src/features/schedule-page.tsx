import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { AppContext, useApp } from "../demo/app-state";
import type { ClubEvent } from "../domain/app-types";
import { DataPage } from "./data-page";
import { ScheduleEvents } from "./schedule-events";
export const SchedulePage = ({
	view,
	period,
	date,
	season,
	now,
	preview,
}: {
	view: "upcoming" | "past" | "calendar";
	period: "upcoming" | "past";
	date: string;
	season: string;
	now: number;
	preview: ClubEvent[];
}): ReactElement => {
	const app = useApp();
	return (
		<DataPage
			config={{
				query: api.pages.schedule,
				args: { view, date, season, now, period },
				preview: preview.map((event) => ({
					event,
					responses: app.data.responses.filter(
						(row) => row.eventId === event.id,
					),
				})),
				size: 20,
			}}
		>
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
