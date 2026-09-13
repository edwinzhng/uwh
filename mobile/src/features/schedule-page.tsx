import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { AppContext, useApp } from "../demo/app-state";
import { EmptyState, Stack } from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { DataPage } from "./data-page";
import { HouseholdEventCard } from "./household-event-card";
import { ScheduleEvents } from "./schedule-events";
export const SchedulePage = ({
	audience,
	view,
	period,
	date,
	season,
	now,
	preview,
}: {
	audience: "household" | "all";
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
				args: { view, date, season, now, period, audience },
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
					{audience === "household" ? (
						<Stack>
							{items.length ? (
								items.map((item) => (
									<HouseholdEventCard key={item.event.id} event={item.event} />
								))
							) : (
								<EmptyState
									title="No household events"
									description="Try another date or switch to All club."
								/>
							)}
						</Stack>
					) : (
						<ScheduleEvents events={items.map((item) => item.event)} />
					)}
				</AppContext.Provider>
			)}
		</DataPage>
	);
};
